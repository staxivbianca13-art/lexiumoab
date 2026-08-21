# LEXIUM — Segurança, Privacidade e Deploy

> Documento técnico para desenvolvedores e operadores da plataforma.
> Atualizado em: julho/2026

---

## 1. Diagnóstico inicial — Riscos encontrados

| # | Risco | Severidade | Status |
|---|-------|-----------|--------|
| 1 | Formulários de CTA sem backend — dados nunca chegavam | Crítico | ✅ Corrigido |
| 2 | Ausência de headers de segurança (CSP, HSTS, X-Frame-Options) | Crítico | ✅ Corrigido |
| 3 | Sem Política de Privacidade ou Termos de Uso reais | Alto | ✅ Corrigido |
| 4 | Links do footer apontando para `#` (páginas legais ausentes) | Alto | ✅ Corrigido |
| 5 | Ausência de consentimento LGPD nos formulários | Alto | ✅ Corrigido |
| 6 | ID de gradiente SVG duplicado (`logoGrad` repetido) | Médio | ✅ Corrigido |
| 7 | Nenhum aviso sobre natureza educacional da IA | Alto | ✅ Corrigido |
| 8 | Sem `.gitignore` nem `.env.example` | Alto | ✅ Corrigido |
| 9 | Sem proteção contra spam e bots nos formulários | Alto | ✅ Corrigido |
| 10 | Sem API para captação de leads | Crítico | ✅ Corrigido (mock + integrações) |
| 11 | Sem cookie notice | Médio | ✅ Corrigido |
| 12 | Sem `robots.txt` | Baixo | ✅ Corrigido |

**Riscos não encontrados (positivo):**
- Nenhuma chave de API exposta no frontend ✓
- Nenhum script de analytics/rastreamento ativo ✓
- Google Fonts é a única dependência externa ✓
- Sem `eval()` ou `innerHTML` com input de usuário ✓

---

## 2. O que foi implementado

### 2.1 `index.html` — Alterações

- **Meta CSP** adicionado no `<head>` (fallback antes dos headers de servidor)
- **Meta `X-Content-Type-Options`** e **`Referrer-Policy`** e **`Permissions-Policy`**
- **Modal de lead capture** funcional com:
  - Campo honeypot invisível (`#website`) — bots preenchem, humanos não
  - Heurística de tempo na página (`top`: submissão < 3s = suspeita)
  - Rate limit client-side (1 submit a cada 10s)
  - Validação de nome, e-mail e consentimento
  - Checkbox LGPD obrigatório com link para Privacy Policy
  - Mensagens de erro por campo
  - Estado de sucesso pós-envio
  - Envio para `/api/leads` via `fetch` com fallback silencioso
- **Todos os botões de CTA** conectados ao modal via seletor por texto
- **Cookie notice** com localStorage para não repetir
- **Aviso de IA** no footer (natureza educacional)
- **ID SVG `logoGrad2` → `logoGradFt`** (elimina conflito de ID duplicado)
- **Links do footer** atualizados para `/privacy.html`, `/terms.html`, `/privacy.html#cookies`, `/privacy.html#exclusao`

### 2.2 Novos arquivos criados

| Arquivo | Descrição |
|---------|-----------|
| `.gitignore` | Bloqueia `.env`, `node_modules`, builds, dados sensíveis |
| `.env.example` | Template completo com todas as variáveis necessárias |
| `vercel.json` | Headers de segurança para Vercel + rewrites de API |
| `_headers` | Headers de segurança para Netlify e Cloudflare Pages |
| `api/leads.js` | Serverless function com validação, honeypot, sanitização, mock + TODOs de integração |
| `privacy.html` | Política de Privacidade completa (LGPD) |
| `terms.html` | Termos de Uso com aviso de IA |
| `robots.txt` | Bloqueia indexação de `/api/` e `/app/` |

---

## 3. Headers de segurança configurados

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
```

> **Nota CSP:** `unsafe-inline` é necessário enquanto os scripts estiverem inline no HTML.
> Em produção com bundler (Next.js, Vite), mova os scripts para arquivos externos e remova `unsafe-inline`.

---

## 4. API de leads (`api/leads.js`)

### Segurança implementada
- Apenas método `POST` aceito
- CORS restrito ao domínio próprio (`ALLOWED_ORIGIN`)
- Honeypot server-side
- Heurística de tempo na página
- Sanitização de todos os campos (strip HTML, maxLength)
- Validação de e-mail com regex segura
- Consentimento LGPD obrigatório
- Mensagens de erro genéricas (sem stack trace)
- Logs sem dados sensíveis

### Pendências da API (TODOs no arquivo)
- [ ] Integrar com banco de dados (Supabase recomendado)
- [ ] Integrar com CRM ou e-mail (Resend recomendado)
- [ ] Implementar rate limiting com Upstash Redis
- [ ] Configurar variáveis de ambiente no painel do host

---

## 5. Deploy seguro

### Estrutura de domínios recomendada

```
lexium.com.br          → Landing page (este projeto)
app.lexium.com.br      → Plataforma interna (lexium-app.html → futuro Next.js)
api.lexium.com.br      → API backend
```

### Vercel (recomendado para MVP)

1. Conecte o repositório GitHub ao Vercel
2. Configure as variáveis de ambiente no painel (Settings → Environment Variables)
3. O `vercel.json` já configura todos os headers automaticamente
4. Ative **"Force HTTPS"** nas configurações do projeto
5. Adicione o domínio customizado `lexium.com.br` e configure DNS
6. Ative **HSTS Preloading** após confirmar que HTTPS funciona por 1 semana
7. Configure **Branch Protection** no GitHub (`main` exige PR + review)

```bash
# Deploy inicial
npm install -g vercel
vercel login
vercel --prod
```

### Netlify (alternativa)

1. Conecte o repositório e configure Build Settings
2. O arquivo `_headers` já configura os headers automaticamente
3. Configure variáveis em Site Settings → Environment Variables
4. Ative **Force HTTPS** em Site Settings → Domain Management
5. Configure redirects em `_redirects` se necessário

### Cloudflare Pages

1. Conecte o repositório ao Cloudflare Pages
2. O arquivo `_headers` é lido automaticamente
3. Habilite o **Cloudflare WAF** para proteção adicional
4. Use **Cloudflare Turnstile** no formulário de leads (substitui reCAPTCHA)
5. Configure Rate Limiting no painel do Cloudflare

### Variáveis de ambiente necessárias no painel

```env
RESEND_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
ALLOWED_ORIGIN=https://lexium.com.br
NODE_ENV=production
```

---

## 6. Analytics — Recomendações

### ✅ Recomendado: Plausible Analytics
- 100% LGPD-compliant sem cookies
- Não coleta dados pessoais
- Não requer aviso de cookies
- Integração simples: `<script defer data-domain="lexium.com.br" src="https://plausible.io/js/script.js"></script>`

### Alternativa: PostHog (self-hosted ou cloud)
- Configurar com `persistence: 'memory'` para não usar cookies
- Não enviar e-mail, nome ou qualquer PII para eventos
- Nomear eventos de forma genérica: `form_submitted`, `cta_clicked`

### Evitar no momento
- Google Analytics 4 (requer DPIA e banner de cookies para LGPD)
- Meta Pixel (alto risco LGPD, coleta ampla de dados)
- Hotjar / Microsoft Clarity sem consentimento (gravam sessões)

---

## 7. Pagamentos — Arquitetura segura

**Princípio:** a LEXIUM **nunca toca dados de cartão**.

```
Usuário → Frontend (seleção de plano) → Backend LEXIUM (cria sessão de checkout)
        → Redirect para gateway (Stripe/MP) → Usuário insere cartão no gateway
        → Gateway processa → Webhook notifica LEXIUM → LEXIUM atualiza assinatura
        → Usuário vê status na área logada
```

### Implementação futura com Stripe
```javascript
// backend: criar sessão de checkout
const session = await stripe.checkout.sessions.create({
  payment_method_types: ['card'],
  line_items: [{ price: 'price_xxx', quantity: 1 }],
  mode: 'subscription',
  success_url: 'https://app.lexium.com.br/dashboard?session_id={CHECKOUT_SESSION_ID}',
  cancel_url: 'https://lexium.com.br/#planos',
});
// retornar session.url para o frontend redirecionar
```

### Regras obrigatórias
- `STRIPE_SECRET_KEY` nunca no frontend
- `STRIPE_WEBHOOK_SECRET` apenas no backend
- Verificar assinatura do webhook com `stripe.webhooks.constructEvent`
- Exibir status de pagamento apenas na área logada (autenticada)

---

## 8. Checklist final de segurança para produção

### 🔴 Crítico — Obrigatório antes do go-live

- [x] Headers de segurança configurados (`vercel.json` ou `_headers`)
- [x] HTTPS obrigatório (HSTS configurado)
- [x] Formulário de lead capture funcional com validação e LGPD
- [x] API de leads com validação server-side
- [x] `.gitignore` bloqueia `.env` e segredos
- [x] Nenhuma chave secreta no frontend
- [ ] Variáveis de ambiente configuradas no painel do host
- [ ] Integração real da API (Supabase + Resend)
- [ ] Rate limiting ativo na API (Upstash)
- [ ] Domínio customizado com HTTPS verificado

### 🟠 Alto — Implementar na primeira semana pós-lançamento

- [x] Política de Privacidade publicada
- [x] Termos de Uso publicados
- [x] Cookie notice
- [x] Aviso de IA e natureza educacional
- [ ] E-mail de boas-vindas para leads confirmados
- [ ] Monitoramento de erros (Sentry ou Axiom)
- [ ] Uptime monitoring (BetterUptime ou UptimeRobot)
- [ ] Backup automático do banco de dados

### 🟡 Médio — Primeiros 30 dias

- [x] `robots.txt` configurado
- [ ] `sitemap.xml` criado e enviado ao Google Search Console
- [ ] Open Graph tags (og:title, og:description, og:image)
- [ ] Analytics privacy-first configurado (Plausible recomendado)
- [ ] Teste de segurança com [securityheaders.com](https://securityheaders.com)
- [ ] Remover `unsafe-inline` do CSP ao migrar para Next.js/Vite
- [ ] DPO designado e canal de contato de privacidade ativo
- [ ] DPIA realizado se coletar dados sensíveis

### 🟢 Baixo — Boas práticas

- [ ] Preload de fontes do Google Fonts
- [ ] Lazy loading de imagens
- [ ] Compressão gzip/brotli habilitada no host
- [ ] Lighthouse audit ≥ 90 em todas as métricas
- [ ] Teste de acessibilidade (WCAG 2.1 AA)
- [ ] Preview deployments com senha de acesso
- [ ] Documentação de incidentes de segurança

---

## 9. Proteção contra ataques

| Vetor | Proteção implementada |
|-------|----------------------|
| XSS | CSP + sanitização no frontend e backend |
| Clickjacking | `X-Frame-Options: DENY` + `frame-ancestors 'none'` |
| CSRF | SameSite cookies + Origin check na API |
| Spam / bots | Honeypot + time-on-page heuristic + rate limiting |
| Brute force | Rate limiting por IP (Upstash — pendente) |
| Exposição de segredos | `.gitignore` + variáveis de ambiente |
| CORS aberto | `Access-Control-Allow-Origin` restrito |
| Injeção | Sanitização de inputs + tipagem forte |
| Scraping | `robots.txt` + rate limiting + Cloudflare WAF |

---

## 10. Contatos de segurança

- Segurança geral: seguranca@lexium.com.br
- Privacidade / LGPD: privacidade@lexium.com.br
- Suporte: contato@lexium.com.br
- Reportar vulnerabilidade: seguranca@lexium.com.br (Responsible Disclosure)

---

*Documento mantido pela equipe LEXIUM. Revisar a cada 6 meses ou após mudanças relevantes na arquitetura.*
