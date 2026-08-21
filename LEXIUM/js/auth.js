/**
 * LEXIUM Auth — Camada de autenticação de alunos (Supabase Auth)
 * ════════════════════════════════════════════════════════════════
 *
 * Lê window.__LEXIUM_SUPABASE__ (injetado em lexium-app.html <head>)
 * e expõe window.LexiumAuth com signUp/signIn/signOut/getSession.
 *
 * A criação do perfil na tabela `alunos` acontece automaticamente no
 * banco via trigger (ver knowledge-base/schema/supabase.sql,
 * função handle_new_user) — o front-end não insere na tabela direto.
 *
 * Requer um projeto Supabase real configurado em window.__LEXIUM_SUPABASE__.
 * Sem isso, todas as funções retornam um erro claro em vez de falhar
 * silenciosamente.
 */
(function () {
  'use strict';

  const cfg = window.__LEXIUM_SUPABASE__ || {};
  const CONFIG_ERROR = { message: 'Login ainda não configurado. Defina window.__LEXIUM_SUPABASE__ em lexium-app.html.' };

  let client = null;
  if (cfg.url && cfg.anonKey && window.supabase && typeof window.supabase.createClient === 'function') {
    client = window.supabase.createClient(cfg.url, cfg.anonKey);
  }

  async function signUp(email, password, nome) {
    if (!client) return { data: null, error: CONFIG_ERROR };
    return client.auth.signUp({
      email,
      password,
      options: { data: { nome } }, // lido pelo trigger handle_new_user() no banco
    });
  }

  async function signIn(email, password) {
    if (!client) return { data: null, error: CONFIG_ERROR };
    return client.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    if (!client) return { error: CONFIG_ERROR };
    return client.auth.signOut();
  }

  async function getSession() {
    if (!client) return { data: { session: null }, error: CONFIG_ERROR };
    return client.auth.getSession();
  }

  async function resetPasswordForEmail(email) {
    if (!client) return { data: null, error: CONFIG_ERROR };
    return client.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/lexium-app.html?auth=login',
    });
  }

  function getClient() {
    return client;
  }

  window.LexiumAuth = { signUp, signIn, signOut, getSession, resetPasswordForEmail, getClient, isConfigured: !!client };
})();
