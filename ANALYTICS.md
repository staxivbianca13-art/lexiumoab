# LEXIUM Analytics — Guia de Configuração e Validação

> Versão 1.0 · Julho 2026

---

## 1. Como configurar

### Passo 1 — Escolha o provider

| Provider | Recomendação | LGPD | Cookies | Custo |
|----------|-------------|------|---------|-------|
| **Plausible** | ✅ Primeira escolha | Compliant | ❌ Nenhum | Pago (€9/mês) |
| **GA4** | Opcional | Requer consentimento | ✅ Usa cookies | Gratuito |
| PostHog | Segunda etapa | Compliant (self-hosted) | Configurável | Grátis até 1M/mês |
| Clarity | Segunda etapa | Requer consentimento | ✅ Usa cookies | Gratuito |

**Para MVP: use apenas Plausible.** Sem cookies, sem banner, sem complicação.

---

### Passo 2 — Configure em `index.html`

Abra `index.html` e localize o bloco `window.__LEXIUM_ANALYTICS__`:

```html
<script>
window.__LEXIUM_ANALYTICS__ = {
  plausibleDomain: 'lexium.com.br',   // ← seu domínio exato no Plausible
  ga4Id: '',                           // ← deixe vazio se não usar GA4
  debug: false,                        // ← true para ver logs no console
};
</script>
```

**Para Plausible:**
1. Crie conta em [plausible.io](https://plausible.io)
2. Adicione o domínio `lexium.com.br`
3. Cole o domínio em `plausibleDomain`
4. O script em `/js/analytics.js` carrega automaticamente

**Para GA4:**
1. Crie propriedade em [analytics.google.com](https://analytics.google.com)
2. Copie o Measurement ID (formato `G-XXXXXXXXXX`)
3. Cole em `ga4Id`
4. ⚠️ Ative o banner de consentimento antes de publicar (ver §LGPD)

---

### Passo 3 — Ative o modo debug para testar

```html
window.__LEXIUM_ANALYTICS__ = {
  plausibleDomain: 'lexium.com.br',
  ga4Id: 'G-XXXXXXXXXX',
  debug: true,  // ← ativa logs no console
};
```

Com `debug: true`, abra o DevTools → Console e você verá:

```
[Lexium Analytics] Lexium Analytics v1.0 inicializado. Providers: Plausible, GA4
[Lexium Analytics] 📊 EVENT: page_view {}
[Lexium Analytics] 📊 EVENT: hero_cta_clicked { location: 'hero' }
[Lexium Analytics] 📊 EVENT: waitlist_form_opened {}
```

---

## 2. Referência completa de eventos

| Evento | Quando dispara | Props enviadas |
|--------|---------------|----------------|
| `page_view` | Carregamento da página | *(automático pelo provider)* |
| `hero_cta_clicked` | Botão "Entrar na Lista" (hero ou CTA section) | `{ location: 'hero' \| 'cta_section' }` |
| `secondary_cta_clicked` | Botão "Ver demonstração" no hero | `{ location: 'hero' }` |
| `demo_request_clicked` | Botão "Solicitar demonstração" (CTA section) | `{ location: 'cta_section' }` |
| `signup_clicked` | Botão "Lista de Espera" na nav | `{ location: 'nav' }` |
| `login_clicked` | Botão "Entrar" na nav | `{ location: 'nav' }` |
| `waitlist_form_opened` | Modal de lead abre | — |
| `waitlist_form_started` | Usuário digita no 1º campo | — |
| `waitlist_form_submitted` | Envio bem-sucedido do form | `{ objetivo: '...' }` |
| `plans_cta_clicked` | Botão em qualquer card de plano | `{ plan: 'avulso' \| 'mensal' \| 'simulados' }` |
| `pricing_section_viewed` | Seção #planos entra em viewport (35%+) | `{ section: 'planos' }` |
| `simulados_section_viewed` | Seção #simulados entra em viewport | `{ section: 'simulados' }` |
| `diagnosis_section_viewed` | Seção #modulos entra em viewport | `{ section: 'modulos' }` |
| `differentials_section_viewed` | Seção #diferenciais entra em viewport | `{ section: 'diferenciais' }` |
| `privacy_policy_clicked` | Clique em qualquer link de privacidade | — |
| `terms_clicked` | Clique em qualquer link de termos | — |

### Propriedades que o sistema NUNCA envia
O `sanitize()` em `js/analytics.js` bloqueia automaticamente:
- `email`, `nome`, `name`, `phone`, `telefone`
- `cpf`, `rg`, `password`, `senha`
- `card`, `cartao`, `token`, `secret`, `key`
- Qualquer string que contenha `@` (formato de e-mail)
- Qualquer string no formato de CPF (`000.000.000-00`)

---

## 3. Como testar se os eventos estão chegando

### Teste com Plausible

1. Acesse [plausible.io/lexium.com.br](https://plausible.io/lexium.com.br) → Goals
2. Clique em "Add goal" → Custom event → digite o nome do evento
3. Abra a landing page em aba separada com `debug: true`
4. Execute as ações (clique no CTA, abra o modal, etc.)
5. Volte ao Plausible — o evento aparece em ~10 segundos em "Real-time"

**Dica:** O script `script.local.js` também registra eventos de `localhost`.

### Teste com GA4

1. Instale a extensão [GA Debugger](https://chrome.google.com/webstore/detail/google-analytics-debugger) no Chrome
2. Abra a landing page
3. No DevTools → Console, procure por `[Lexium Analytics] 📊 EVENT`
4. No painel GA4: Reports → Realtime → Events (pode levar 30s)
5. Para eventos customizados: GA4 → Configure → Events → marque como conversão

### Teste no console do navegador

```javascript
// Verificar se o módulo carregou
console.log(window.Lexium); // deve mostrar { track: ƒ, sanitize: ƒ }

// Disparar evento manualmente
Lexium.track('test_event', { source: 'console' });

// Verificar sanitização (e-mail deve ser bloqueado)
Lexium.sanitize({ objetivo: 'aprovacao', email: 'teste@teste.com' });
// Resultado esperado: { objetivo: 'aprovacao' }  — email removido ✓

// Ver estado do config
console.log(window.__LEXIUM_ANALYTICS__);
```

### Checklist de validação (marque cada item)

```
[ ] window.__LEXIUM_ANALYTICS__ está configurado com domínio/ID correto
[ ] window.Lexium.track aparece no console (analytics.js carregou)
[ ] Clique no botão "Entrar na Lista de Espera" (hero) → evento no console
[ ] Modal abre → waitlist_form_opened aparece no console
[ ] Digitar no campo nome → waitlist_form_started aparece (apenas 1x)
[ ] Enviar formulário → waitlist_form_submitted com { objetivo: '...' }
[ ] Clique em "Entrar" na nav → login_clicked
[ ] Scroll até seção Planos → pricing_section_viewed
[ ] Scroll até seção Simulados → simulados_section_viewed
[ ] Clique em plano "Mensal" → plans_cta_clicked { plan: 'mensal' }
[ ] Clique em link de Privacidade → privacy_policy_clicked
[ ] Eventos aparecem no painel do Plausible/GA4 em tempo real
[ ] Lexium.sanitize({ email: 'a@b.com' }) retorna {} (PII bloqueado)
```

---

## 4. Onde encontrar os eventos no painel

### Plausible
- **Acesse:** plausible.io → seu domínio → Goals
- **Adicione goal:** Settings → Goals → Add goal → Custom event
- **Nomes:** exatamente como na tabela acima (case-sensitive)
- **Funil:** Settings → Funnels → configure a sequência:
  `waitlist_form_opened → waitlist_form_started → waitlist_form_submitted`
- **Dashboard padrão:** Real-time, Top Pages, Sources, Devices

### GA4
- **Eventos:** Reports → Engagement → Events
- **Tempo real:** Reports → Realtime → Events (primeiros 30 min)
- **Conversões:** Configure → Events → marque `waitlist_form_submitted` como conversão
- **Explorar:** Explore → crie Funnel Exploration com os 3 steps do form
- **Propriedades customizadas:** Configure → Custom definitions → adicione `objetivo`, `plan`, `location`

---

## 5. LGPD — Cuidados aplicados

### Plausible ✅ Sem restrições
- Não usa cookies
- Não coleta dados pessoais
- IP é anonimizado e não armazenado
- Dados ficam no servidor Plausible (EU) ou self-hosted
- **Nenhum banner de consentimento necessário**

### GA4 ⚠️ Requer consentimento

Para usar GA4 em conformidade com a LGPD:

1. **Adicione banner de consentimento** antes de carregar GA4
2. **Implemente Consent Mode v2**:
   ```javascript
   // Antes de carregar GA4
   gtag('consent', 'default', {
     analytics_storage: 'denied',
     ad_storage: 'denied',
   });
   // Após consentimento do usuário:
   gtag('consent', 'update', {
     analytics_storage: 'granted',
   });
   ```
3. **Remova** `allow_google_signals: false` se implementar consent mode
4. **Configure** Data Retention para 14 meses máximo (GA4 Admin)
5. **Adicione** Google Analytics ao cookie notice existente

### Sanitização de dados (todos os providers)

O `sanitize()` em `js/analytics.js` é executado **antes** de qualquer envio.
Campos bloqueados: email, nome, telefone, CPF, senha, cartão, tokens.

**Regras:**
- Nunca passe `email` ou `nome` como propriedade de evento
- O objetivo (`objetivo`) do formulário é seguro — é uma categoria, não PII
- Eventos de `page_view` não carregam dados do usuário
- Não use `userId` antes de obter base legal adequada

---

## 6. Pendências — Segunda etapa

### Curto prazo (1-4 semanas)
- [ ] Ativar Plausible com domínio real e validar funil
- [ ] Configurar Goals no Plausible para todos os eventos listados
- [ ] Implementar funil: `form_opened → form_started → form_submitted`
- [ ] Adicionar `sitemap.xml` e enviar ao Google Search Console
- [ ] Medir taxa de conversão baseline (visitante → lead)

### Médio prazo (1-2 meses)
- [ ] Ativar PostHog para análise de comportamento (sem gravação de sessão)
- [ ] Implementar A/B test no headline do hero (PostHog Feature Flags)
- [ ] Adicionar evento `scroll_depth` para medir engajamento por seção
- [ ] Integrar Sentry para error tracking em produção
- [ ] Dashboard de métricas interno com Plausible Shared Links

### Longo prazo (após lançamento)
- [ ] Ativar GA4 com Consent Mode v2 (se precisar de remarketing)
- [ ] Microsoft Clarity para mapas de calor (com consentimento)
- [ ] Integrar analytics com CRM (UTMs → lead source tracking)
- [ ] Relatório semanal automático via Plausible API + Resend

---

## 7. Estrutura de arquivos

```
LEXIUM/
├── index.html              ← window.__LEXIUM_ANALYTICS__ aqui
├── js/
│   └── analytics.js        ← camada central de tracking
├── ANALYTICS.md            ← este arquivo
├── .env.example            ← variáveis de ambiente de referência
└── vercel.json / _headers  ← CSP já inclui plausible.io e GA4
```

---

*Documento mantido pela equipe LEXIUM. Atualizar ao adicionar novos eventos ou providers.*
