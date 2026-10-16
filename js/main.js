/* =====================================================================
   ZAREN_01 — сайт-визитка. Главный скрипт.
   Загружает data/config.json, выбирает язык, рисует шапку, «кто это», каналы связи и подвал.
   Остальные блоки (расписание, статус эфира, аватар, терминал) подключаются отдельными файлами
   и слушают событие 'zaren:ready' / 'zaren:lang'.
   ===================================================================== */
'use strict';

const Z = window.Z = {
  cfg: null,
  lang: 'ru',
  // текст интерфейса на текущем языке (если нет перевода — берётся русский)
  t(key) { const T = this.cfg.texts; return (T[this.lang] && T[this.lang][key] != null) ? T[this.lang][key] : (T.ru[key] != null ? T.ru[key] : ''); },
  // поле, которое может быть строкой или { ru, en }
  L(v) { return v && typeof v === 'object' ? (v[this.lang] != null ? v[this.lang] : v.ru) : v; },
  $: (s, r = document) => r.querySelector(s),
  $$: (s, r = document) => [...r.querySelectorAll(s)],
  // localStorage может быть недоступен (приватный режим, запрет cookie) — тогда просто не запоминаем
  store: {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* не запомнили — не страшно */ } },
  },
  reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
};

/* ---------- Язык ---------- */
function pickLang() {
  const saved = Z.store.get('zaren-lang');
  if (saved === 'ru' || saved === 'en') return saved;
  return /^(ru|uk|be|kk)/i.test(navigator.language || '') ? 'ru' : 'en';
}
function setLang(lang) {
  Z.lang = lang;
  Z.store.set('zaren-lang', lang);
  document.documentElement.lang = lang;
  Z.$$('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  renderTexts();
  renderLinks();
  document.dispatchEvent(new CustomEvent('zaren:lang', { detail: lang }));
}

/* ---------- Тексты с data-t="ключ" ---------- */
function renderTexts() {
  document.title = Z.t('title');
  Z.$$('[data-t]').forEach(e => { e.textContent = Z.t(e.dataset.t); });
  Z.$$('[data-t-aria]').forEach(e => e.setAttribute('aria-label', Z.t(e.dataset.tAria)));
}

/* ---------- Каналы связи ---------- */
function renderLinks() {
  const box = Z.$('#links');
  box.textContent = '';
  for (const l of Z.cfg.links) {
    if (!l.enabled) continue;                                 // скрытые — одной строкой в конфиге
    const a = document.createElement('a');
    a.className = 'link';
    a.href = l.url || '#';
    if (/^https?:/i.test(a.href) && !a.href.startsWith(location.origin)) { a.target = '_blank'; a.rel = 'noopener'; }
    const title = Z.L(l.title), label = Z.L(l.label);
    a.setAttribute('aria-label', label ? `${title} — ${label}` : title);
    a.innerHTML = `<span class="ico" aria-hidden="true"><svg><use href="#i-${l.icon || 'link'}"/></svg></span>
      <span class="lt"><b></b><small></small></span><span class="go" aria-hidden="true">→</span>`;
    a.querySelector('b').textContent = title;              // тексты — только как текст, без HTML
    a.querySelector('small').textContent = label || '';
    box.appendChild(a);
  }
}

/* ---------- Подвал: почта и копирование ---------- */
function renderFooter() {
  const s = Z.cfg.site, mail = Z.$('#mail');
  mail.textContent = s.email; mail.href = 'mailto:' + s.email;
  Z.$('#source').href = s.sourceUrl || '#';
  Z.$('#year').textContent = new Date().getFullYear();
  const btn = Z.$('#copyMail');
  btn.addEventListener('click', async () => {
    let ok = false;
    try { await navigator.clipboard.writeText(s.email); ok = true; }
    catch (e) {                                              // старые браузеры / нет разрешения
      const ta = document.createElement('textarea'); ta.value = s.email; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand('copy'); } catch (e2) { ok = false; }
      ta.remove();
    }
    btn.textContent = ok ? Z.t('copied') : s.email;
    clearTimeout(btn._t); btn._t = setTimeout(() => { btn.textContent = Z.t('copy'); }, 2000);
  });
}

/* ---------- Включение/выключение блоков ---------- */
function applyBlocks() {
  const b = Z.cfg.blocks || {};
  Z.$$('[data-block]').forEach(e => { if (b[e.dataset.block] === false) e.hidden = true; });
}

/* ---------- Запуск ---------- */
async function boot() {
  try {
    const r = await fetch('data/config.json', { cache: 'no-cache' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    Z.cfg = await r.json();
  } catch (e) {
    // так бывает, если открыть index.html двойным кликом (file://) — см. README
    console.error('config.json не загрузился:', e);
    Z.$('#status').textContent = 'config.json не загрузился — откройте сайт через сервер (см. README)';
    return;
  }
  Z.$('#siteName').textContent = Z.cfg.site.name || 'ZAREN_01';
  applyBlocks();
  Z.$$('.lang button').forEach(b => b.addEventListener('click', () => setLang(b.dataset.lang)));
  renderFooter();
  setLang(pickLang());
  document.dispatchEvent(new CustomEvent('zaren:ready'));
}
boot();
