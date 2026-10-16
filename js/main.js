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

/* ---------- Язык ----------
   1) если посетитель уже нажимал RU/EN — его выбор;
   2) язык устройства: русский (и языки стран, где русский — общий: белорусский, казахский и т.д.) → RU;
   3) устройство на английском, но часовой пояс России/СНГ → RU (многие ставят телефон на английский);
   4) иначе — EN. По IP не определяем: это запрос к стороннему сервису, а сайт без трекеров. */
const RU_LANGS = /^(ru|be|kk|ky|uz|tg|hy|az)\b/i;
const RU_ZONES = /^(Europe\/(Moscow|Kaliningrad|Samara|Volgograd|Kirov|Ulyanovsk|Astrakhan|Saratov|Simferopol|Minsk)|Asia\/(Yekaterinburg|Omsk|Novosibirsk|Barnaul|Tomsk|Novokuznetsk|Krasnoyarsk|Irkutsk|Chita|Yakutsk|Khandyga|Vladivostok|Ust-Nera|Magadan|Sakhalin|Srednekolymsk|Kamchatka|Anadyr|Almaty|Qostanay|Aqtobe|Aqtau|Atyrau|Oral|Qyzylorda|Bishkek|Tashkent|Samarkand|Dushanbe|Yerevan|Baku))$/;
function pickLang() {
  const saved = Z.store.get('zaren-lang');
  if (saved === 'ru' || saved === 'en') return saved;
  const langs = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || '']).map(String);
  if (RU_LANGS.test(langs[0])) return 'ru';
  if (/^en\b/i.test(langs[0]) || !langs[0]) {
    let tz = '';
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* старый браузер */ }
    if (RU_ZONES.test(tz) || langs.some(l => RU_LANGS.test(l))) return 'ru';
  }
  return 'en';
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
