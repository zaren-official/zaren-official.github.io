/* =====================================================================
   Статус эфира: идёт ли сейчас стрим на Twitch.
   Без токена в коде. По умолчанию спрашиваем публичный сервис DecAPI (decapi.me):
   он отвечает строкой — «OFFLINE» или время, сколько идёт эфир («1 hour, 15 minutes»).
   Можно подключить свой сервер (live.endpoint в config.json) — см. README.
   Если узнать не удалось (сеть, лимит Twitch, сервис лёг) — страница просто показывает расписание.
   ===================================================================== */
'use strict';
(function () {
  const TIMEOUT = 4000;

  // ссылка «смотреть»: кнопка Twitch из списка каналов, иначе twitch.tv/<ник>
  function watchUrl() {
    const t = (Z.cfg.links || []).find(l => l.id === 'twitch');
    if (t && t.url && t.url !== '#') return t.url;
    return 'https://www.twitch.tv/' + encodeURIComponent(Z.cfg.site.twitchChannel || '');
  }

  async function fetchText(url) {
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), TIMEOUT);
    try {
      const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return (await r.text()).trim();
    } finally { clearTimeout(timer); }
  }

  // true — в эфире, false — нет, null — не удалось узнать
  async function isLive(channel) {
    const ep = (Z.cfg.live || {}).endpoint;
    if (ep) {                                                // свой сервер: отвечает JSON {"live": true|false}
      const j = JSON.parse(await fetchText(ep.replace('{channel}', encodeURIComponent(channel))));
      return typeof j.live === 'boolean' ? j.live : null;
    }
    const t = await fetchText(`https://decapi.me/twitch/uptime/${encodeURIComponent(channel)}?offline_msg=OFFLINE`);
    if (t === 'OFFLINE') return false;
    // «в эфире» засчитываем только по времени эфира; ошибки Twitch (например, 429) приходят тоже со статусом 200
    if (/^\d+\s+(second|minute|hour|day)s?\b/i.test(t)) return true;
    return null;
  }

  async function check() {
    const ch = Z.cfg.site.twitchChannel;
    let live = null;
    try { live = await isLive(ch); } catch (e) { live = null; }
    Z.live = { checked: live !== null, live: live === true, url: watchUrl() };
    Z.renderStatus && Z.renderStatus();
  }

  Z.checkLive = check;                                       // для проверки из консоли: Z.checkLive()

  function init() {
    if ((Z.cfg.blocks || {}).liveStatus === false || !Z.cfg.site.twitchChannel) return;
    const every = Math.max(60, ((Z.cfg.live || {}).intervalSec || 120)) * 1000;
    check();
    let timer = setInterval(check, every);
    // вкладка в фоне — не дёргаем сервис зря; вернулись — сразу проверяем
    document.addEventListener('visibilitychange', () => {
      clearInterval(timer);
      if (!document.hidden) { check(); timer = setInterval(check, every); }
    });
  }
  if (Z.cfg) init(); else document.addEventListener('zaren:ready', init, { once: true });
})();
