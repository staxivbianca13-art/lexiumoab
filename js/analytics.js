/**
 * LEXIUM Analytics — Camada Central de Tracking
 * ════════════════════════════════════════════════════════════════
 *
 * COMO FUNCIONA:
 *  1. Lê window.__LEXIUM_ANALYTICS__ (injetado em index.html <head>)
 *  2. Carrega dinamicamente Plausible e/ou GA4 se configurados
 *  3. Expõe window.Lexium.track(event, props) para toda a página
 *  4. Sanitiza automaticamente qualquer PII antes de enviar
 *  5. É completamente silencioso se nenhuma chave estiver configurada
 *
 * PROVIDERS SUPORTADOS:
 *  ✅ Plausible   — ativo (recomendado, LGPD-compliant, sem cookies)
 *  ✅ GA4         — ativo (requer consentimento para LGPD completa)
 *  🔲 PostHog     — stub pronto, descomentar quando quiser ativar
 *  🔲 MS Clarity  — stub pronto, descomentar quando quiser ativar
 *  🔲 Sentry      — stub pronto para error tracking
 *
 * LGPD:
 *  - Plausible: não usa cookies, não coleta PII → nenhum banner necessário
 *  - GA4: usa cookies → requer banner de consentimento (art. 7º LGPD)
 *  - Todos os eventos passam por sanitize() que bloqueia PII automaticamente
 *
 * @version 1.0.0
 */
(function () {
  'use strict';

  /* ── Configuração ─────────────────────────────────────────────── */
  const cfg = window.__LEXIUM_ANALYTICS__ || {};
  const PLAUSIBLE_DOMAIN = cfg.plausibleDomain || '';
  const GA4_ID           = cfg.ga4Id           || '';
  const DEBUG            = cfg.debug            === true;

  /* ── PII Guard ────────────────────────────────────────────────── */
  // Campos que NUNCA podem ir para analytics
  const PII_KEYS    = ['email','nome','name','phone','telefone','cpf','rg','password','senha','card','cartao','token','secret','key'];
  const PII_PATTERN = /@|^\d{3}\.\d{3}\.\d{3}-\d{2}$/; // e-mail ou CPF

  function sanitize(props) {
    if (!props || typeof props !== 'object') return {};
    const safe = {};
    for (const [k, v] of Object.entries(props)) {
      // Bloqueia chave suspeita
      if (PII_KEYS.some(p => k.toLowerCase().includes(p))) continue;
      // Bloqueia valor com padrão de PII
      if (typeof v === 'string' && PII_PATTERN.test(v)) continue;
      // Limita tamanho de string para evitar vazamento acidental
      safe[k] = typeof v === 'string' ? v.slice(0, 100) : v;
    }
    return safe;
  }

  /* ── Loader: Plausible ───────────────────────────────────────── */
  function loadPlausible() {
    if (!PLAUSIBLE_DOMAIN) return;
    const s = document.createElement('script');
    s.defer = true;
    s.dataset.domain = PLAUSIBLE_DOMAIN;
    // script.local.js rastreia localhost (útil em dev).
    // script.js ignora localhost — só rastreia o domínio de produção.
    // Detectamos automaticamente para não poluir dados reais com tráfego local.
    const isLocalhost = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    s.src = isLocalhost
      ? 'https://plausible.io/js/script.local.js'
      : 'https://plausible.io/js/script.js';
    s.onerror = () => log('warn', 'Plausible não carregou (bloqueador de anúncios?)');
    document.head.appendChild(s);
    log('info', `Plausible [${isLocalhost ? 'local' : 'prod'}] domínio:`, PLAUSIBLE_DOMAIN);
  }

  /* ── Loader: GA4 ─────────────────────────────────────────────── */
  function loadGA4() {
    if (!GA4_ID) return;

    // ⚠️  GA4 usa cookies. Para LGPD completa, só carregue após
    //     consentimento do usuário. Veja ANALYTICS.md §LGPD.
    const s = document.createElement('script');
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
    s.onerror = () => log('warn', 'GA4 não carregou');
    document.head.appendChild(s);

    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;

    gtag('js', new Date());
    gtag('config', GA4_ID, {
      // Desativa sinalização de anúncios e personalização — reduz escopo de dados
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      // Nota: anonymize_ip era parâmetro do Universal Analytics.
      // No GA4, a anonimização de IP é automática e sempre ativa — este campo é no-op.
      // Mantido apenas como documentação de intenção.
      anonymize_ip: true,
      // Envia page_view automático na carga da página — correto para landing page estática.
      // Se migrar para SPA (Next.js), mude para false e dispare manualmente por rota.
      send_page_view: true,
    });

    log('info', 'GA4 carregado:', GA4_ID);
  }

  /* ── Loader: PostHog (stub) ──────────────────────────────────── */
  // Descomente e configure quando quiser ativar.
  // function loadPostHog() {
  //   const POSTHOG_KEY  = cfg.postHogKey  || '';
  //   const POSTHOG_HOST = cfg.postHogHost || 'https://app.posthog.com';
  //   if (!POSTHOG_KEY) return;
  //   !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){...},...}(document,window.posthog||(window.posthog=[]));
  //   posthog.init(POSTHOG_KEY, {
  //     api_host: POSTHOG_HOST,
  //     persistence: 'memory',       // sem cookies
  //     autocapture: false,          // captura manual apenas
  //     capture_pageview: false,     // controlamos manualmente
  //     disable_session_recording: true, // não grava sessões sem consentimento
  //   });
  // }

  /* ── Loader: Microsoft Clarity (stub) ──────────────────────── */
  // Descomente e configure quando quiser ativar.
  // function loadClarity() {
  //   const CLARITY_ID = cfg.clarityId || '';
  //   if (!CLARITY_ID) return;
  //   // ⚠️  Clarity grava sessões. Exige consentimento explícito para LGPD.
  //   (function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
  //    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
  //    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
  //   })(window, document, "clarity", "script", CLARITY_ID);
  // }

  /* ── Loader: Sentry (stub de error tracking) ────────────────── */
  // Descomente e configure quando quiser ativar.
  // function loadSentry() {
  //   const SENTRY_DSN = cfg.sentryDsn || '';
  //   if (!SENTRY_DSN) return;
  //   // npm install @sentry/browser — ou via CDN:
  //   // import * as Sentry from "https://browser.sentry-cdn.com/7.x.x/bundle.min.js";
  //   // Sentry.init({ dsn: SENTRY_DSN, environment: 'production',
  //   //   beforeSend(event) { delete event.user; return event; } // remove PII
  //   // });
  // }

  /* ── Função principal: track() ───────────────────────────────── */
  /**
   * Dispara um evento de analytics em todos os providers configurados.
   *
   * @param {string} event   - Nome do evento (snake_case)
   * @param {object} [props] - Propriedades adicionais (sem PII)
   *
   * @example
   * Lexium.track('hero_cta_clicked', { location: 'hero' });
   * Lexium.track('waitlist_form_submitted', { objetivo: 'aprovacao_proxima' });
   */
  function track(event, props) {
    if (!event || typeof event !== 'string') return;

    const safeProps = sanitize(props);

    log('event', event, safeProps);

    // ── Plausible
    if (PLAUSIBLE_DOMAIN) {
      if (typeof window.plausible === 'function') {
        try {
          window.plausible(event, Object.keys(safeProps).length ? { props: safeProps } : undefined);
        } catch (e) {
          log('warn', 'Plausible track error:', e.message);
        }
      } else {
        // Plausible usa queue enquanto o script não carrega
        window.plausible = window.plausible || function() {
          (window.plausible.q = window.plausible.q || []).push(arguments);
        };
        window.plausible(event, Object.keys(safeProps).length ? { props: safeProps } : undefined);
      }
    }

    // ── GA4
    if (GA4_ID && typeof window.gtag === 'function') {
      try {
        window.gtag('event', event, safeProps);
      } catch (e) {
        log('warn', 'GA4 track error:', e.message);
      }
    }

    // ── PostHog (stub)
    // if (typeof window.posthog !== 'undefined') {
    //   window.posthog.capture(event, safeProps);
    // }

    // ── Sentry breadcrumb (stub)
    // if (typeof window.Sentry !== 'undefined') {
    //   window.Sentry.addBreadcrumb({ category: 'analytics', message: event, data: safeProps });
    // }
  }

  /* ── Utilitário de log ───────────────────────────────────────── */
  function log(level, ...args) {
    if (!DEBUG) return;
    const prefix = '[Lexium Analytics]';
    if (level === 'event') console.log(`${prefix} 📊 EVENT:`, ...args);
    else if (level === 'warn') console.warn(`${prefix}`, ...args);
    else console.log(`${prefix}`, ...args);
  }

  /* ── Inicialização ───────────────────────────────────────────── */
  const isEnabled = !!(PLAUSIBLE_DOMAIN || GA4_ID);

  if (isEnabled) {
    loadPlausible();
    loadGA4();
    // loadPostHog();
    // loadClarity();
    // loadSentry();
  } else {
    log('info', 'Analytics desativado. Configure window.__LEXIUM_ANALYTICS__ em index.html.');
  }

  /* ── API pública ─────────────────────────────────────────────── */
  window.Lexium = window.Lexium || {};
  window.Lexium.track    = track;
  window.Lexium.sanitize = sanitize; // exportado para testes no console

  log('info', `Lexium Analytics v1.0 inicializado. Providers: ${
    [PLAUSIBLE_DOMAIN && 'Plausible', GA4_ID && 'GA4'].filter(Boolean).join(', ') || 'nenhum (modo silencioso)'
  }`);

})();
