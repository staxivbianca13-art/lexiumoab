#!/usr/bin/env python3
"""
LEXIUM — Seed da base de conhecimento no Supabase (kb_chunks / kb_pecas)

Lê os JSONs já curados em knowledge-base/content/topics/*.json e
knowledge-base/content/questions/provas-anteriores.json, gera embeddings
(OpenAI text-embedding-3-small) e grava/atualiza (upsert) nas tabelas
kb_chunks e kb_pecas do Supabase — schema em knowledge-base/schema/supabase.sql.

Isso é o passo seguinte natural depois de curar conteúdo pra JSON: os
arquivos em knowledge-base/content/ continuam sendo a "fonte da verdade"
editável; este script é a ponte que os leva pro banco (com embedding) sempre
que você quiser (re)popular o Supabase. Reexecutar é seguro — usa upsert por
chave estável (chunk_key / external_id), não duplica linhas.

Zero dependências além da stdlib do Python (urllib) — não precisa `pip install`.

Pré-requisitos (variáveis de ambiente, exceto em --dry-run):
  SUPABASE_URL
  SUPABASE_SERVICE_ROLE_KEY   (nunca a anon key — precisa bypassar RLS pra escrever)
  OPENAI_API_KEY              (só pra gerar embedding — troque EMBEDDING_MODEL
                                abaixo se preferir outro provedor de embeddings)

Uso:
  python3 scripts/seed_knowledge_base.py             # roda de verdade
  python3 scripts/seed_knowledge_base.py --dry-run   # só mostra o que faria,
                                                       # sem chamar OpenAI nem Supabase
"""
import json
import os
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TOPICS_DIR = ROOT / "knowledge-base" / "content" / "topics"
QUESTIONS_DIR = ROOT / "knowledge-base" / "content" / "questions"

EMBEDDING_MODEL = "text-embedding-3-small"
EMBEDDING_DIMENSIONS = 1536

# kb_chunks.tipo só aceita estes valores (ver CHECK constraint no schema)
CONTENT_TYPE_TO_TIPO = {
    "concept": "topico",
    "rule": "topico",
    "statistics": "topico",
    "piece_structure": "topico",
    "jurisprudence": "sumula",
    "checklist": "topico",
}


def get_env(name, required=True, default=None):
    val = os.environ.get(name, default)
    if required and not val:
        print(f"ERRO: variável de ambiente {name} não configurada.", file=sys.stderr)
        sys.exit(1)
    return val


def embed_text(text, api_key, dry_run):
    if dry_run:
        return None  # não gera embedding falso — deixa None pra deixar claro que é simulado
    req = urllib.request.Request(
        "https://api.openai.com/v1/embeddings",
        data=json.dumps({"model": EMBEDDING_MODEL, "input": text}).encode("utf-8"),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())
    return data["data"][0]["embedding"]


def supabase_upsert(table, rows, on_conflict, supabase_url, service_key, dry_run):
    if not rows:
        return
    if dry_run:
        print(f"  [dry-run] faria upsert em '{table}' ({len(rows)} linha(s), on_conflict={on_conflict})")
        return
    url = f"{supabase_url}/rest/v1/{table}?on_conflict={on_conflict}"
    req = urllib.request.Request(
        url,
        data=json.dumps(rows).encode("utf-8"),
        headers={
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json",
            "Prefer": "resolution=merge-duplicates,return=minimal",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            resp.read()
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")[:500]
        print(f"  ERRO ao gravar em '{table}': HTTP {e.code} — {body}", file=sys.stderr)
        raise


def seed_kb_chunks(supabase_url, service_key, openai_key, dry_run):
    """topics/direito-*.json -> tabela kb_chunks (conteúdo teórico curado, para RAG)."""
    files = sorted(TOPICS_DIR.glob("direito-*.json"))
    if not files:
        print(f"Nenhum arquivo direito-*.json encontrado em {TOPICS_DIR}")
        return 0

    total = 0
    for path in files:
        data = json.loads(path.read_text(encoding="utf-8"))
        area = data.get("area", path.stem)
        chunks = data.get("chunks", [])
        rows = []
        for c in chunks:
            # Dois formatos convivem na base hoje: o rico (title/content/content_type/...,
            # usado em direito-civil.json, direito-penal.json etc.) e o simples legado
            # (só id + texto, em direito-material.json / direito-processual.json).
            texto = c.get("content") or c.get("texto")
            if not texto:
                print(f"  aviso: chunk '{c.get('id')}' de {path.name} sem conteúdo, pulando", file=sys.stderr)
                continue

            embedding = embed_text(texto, openai_key, dry_run)
            row = {
                "chunk_key": c["id"],
                "fonte": path.stem,
                "section": c.get("topic"),
                "texto": texto,
                "tipo": CONTENT_TYPE_TO_TIPO.get(c.get("content_type"), "topico"),
                "temas": c.get("tags", []),
                "metadados": {
                    "title": c.get("title"),
                    "area": area,
                    "subject": c.get("subject"),
                    "piece_type": c.get("piece_type", []),
                    "legal_basis": c.get("legal_basis", []),
                    "evaluation_criteria": c.get("evaluation_criteria", []),
                    "common_errors": c.get("common_errors", []),
                    "difficulty": c.get("difficulty"),
                    "oab_relevance": c.get("oab_relevance"),
                },
            }
            if embedding is not None:
                row["embedding"] = embedding
            rows.append(row)

        print(f"{path.name}: {len(rows)} chunk(s) de '{area}'")
        supabase_upsert("kb_chunks", rows, "chunk_key", supabase_url, service_key, dry_run)
        total += len(rows)

    return total


def seed_kb_pecas(supabase_url, service_key, dry_run):
    """questions/provas-anteriores.json -> tabela kb_pecas.

    Usa o arquivo COMPLETO (com resposta_modelo) — essa tabela só é lida
    pelo backend/admin, nunca fica exposta ao navegador do aluno (ao
    contrário de provas-anteriores-public.json, que é a versão sem
    gabarito usada pelo fetch direto do cliente em lexium-app.html).
    """
    path = QUESTIONS_DIR / "provas-anteriores.json"
    if not path.exists():
        print(f"Arquivo não encontrado: {path}")
        return 0

    data = json.loads(path.read_text(encoding="utf-8"))
    rows = []
    for ex in data.get("exames", []):
        peca = ex.get("peca")
        if not peca or not peca.get("enunciado"):
            continue
        rows.append({
            "external_id": ex["id"],
            "referencia_exame": ex.get("exame"),
            "tipo_peca": ex.get("tipo_peca"),
            "enunciado": peca["enunciado"],
            "resolucao_modelo": peca.get("resposta_modelo"),
            "temas": ex.get("temas_identificados", []),
            "ativo": True,
        })

    print(f"{path.name}: {len(rows)} peça(s) real(is) da FGV (Direito do Trabalho)")
    supabase_upsert("kb_pecas", rows, "external_id", supabase_url, service_key, dry_run)
    return len(rows)


def main():
    dry_run = "--dry-run" in sys.argv

    supabase_url = get_env("SUPABASE_URL", required=not dry_run, default="https://dry-run.local")
    service_key = get_env("SUPABASE_SERVICE_ROLE_KEY", required=not dry_run, default="dry-run")
    openai_key = get_env("OPENAI_API_KEY", required=not dry_run)

    print(f"{'[DRY RUN] ' if dry_run else ''}Semeando base de conhecimento do LEXIUM no Supabase...\n")

    n_chunks = seed_kb_chunks(supabase_url, service_key, openai_key, dry_run)
    n_pecas = seed_kb_pecas(supabase_url, service_key, dry_run)

    print(f"\nConcluído. kb_chunks: {n_chunks} | kb_pecas: {n_pecas}")
    if dry_run:
        print("(dry-run — nada foi gravado no Supabase nem enviado pra OpenAI)")


if __name__ == "__main__":
    main()
