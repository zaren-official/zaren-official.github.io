/* =====================================================================
   Расписание, таймер и строка статуса «СИГНАЛ ОЖИДАЕТСЯ · ближайший сеанс».
   Время в config.json — по site.homeTimezone (МСК); посетителю показываем и его местное.
   До даты дебюта таймер считает до дебюта, после — до ближайшего сеанса по расписанию.
   ===================================================================== */
'use strict';
(function () {
  const VISITOR_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  const HOUR = 3600e3;

  /* ---------- Часовые пояса без библиотек ---------- */
  // смещение пояса tz от UTC (в минутах) в момент date
  function tzOffset(date, tz) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }).formatToParts(date);
    const g = t => +p.find(x => x.type === t).value;
    return Math.round((Date.UTC(g('year'), g('month') - 1, g('day'), g('hour'), g('minute'), g('second')) - date.getTime()) / 60000);
  }
  // «дата и время по часам пояса tz» → настоящий момент времени
  function zoned(y, m, d, hh, mm, tz) {
    const guess = Date.UTC(y, m, d, hh, mm);
    return new Date(guess - tzOffset(new Date(guess), tz) * 60000);
  }
  // сегодняшняя дата по часам пояса tz
  function todayIn(tz) {
    const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
    const g = t => +p.find(x => x.type === t).value;
    return { y: g('year'), m: g('month') - 1, d: g('day') };
  }

  /* ---------- Ближайшие сеансы ---------- */
  // для каждого сеанса из расписания — ближайший ещё не закончившийся раз
  function occurrences(now = Date.now()) {
    const S = Z.cfg.schedule || {}, tz = Z.cfg.site.homeTimezone || 'Europe/Moscow', len = (S.streamHours || 3) * HOUR;
    const t = todayIn(tz), list = [];
    for (const s of S.streams || []) {
      const [hh, mm] = String(s.time).split(':').map(Number);
      for (let k = -1; k <= 7; k++) {
        const dow = (new Date(Date.UTC(t.y, t.m, t.d + k)).getUTCDay() + 6) % 7 + 1;      // 1 — пн … 7 — вс
        if (dow !== s.day) continue;
        const start = zoned(t.y, t.m, t.d + k, hh, mm, tz).getTime();
        if (start + len > now) { list.push({ start, end: start + len, s }); break; }
      }
    }
    return list.sort((a, b) => a.start - b.start);
  }
  const debutAt = () => { const v = Date.parse(Z.cfg.debut || ''); return Number.isFinite(v) ? v : 0; };

  // что сейчас: до дебюта / идёт сеанс по расписанию / ждём следующий
  function state(now = Date.now()) {
    const debut = debutAt();
    if (debut && now < debut) return { kind: 'debut', at: debut };
    const occ = occurrences(now), cur = occ.find(o => o.start <= now);
    // «окно» сеанса по расписанию: стрим должен идти, но так ли это — знает только live.js
    if (cur) { const after = occ.find(o => o.start > now); return { kind: 'window', at: cur.start, end: cur.end, nextAt: after ? after.start : 0 }; }
    return occ.length ? { kind: 'next', at: occ[0].start } : { kind: 'none' };
  }

  /* ---------- Форматирование ---------- */
  const pad = n => String(n).padStart(2, '0');
  // местное время посетителя: «пт, 20:00»; если до него больше 6 дней — с датой: «1.11, 20:00»
  function localWhen(ms) {
    const d = new Date(ms), time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
    if (ms - Date.now() > 6 * 24 * HOUR) return `${d.getDate()}.${pad(d.getMonth() + 1)}, ${time}`;
    return `${Z.t('daysShort')[(d.getDay() + 6) % 7]}, ${time}`;
  }
  function countdown(ms) {
    const s = Math.max(0, Math.floor(ms / 1000)), u = Z.t('units');
    const d = Math.floor(s / 86400), h = Math.floor(s % 86400 / 3600), m = Math.floor(s % 3600 / 60);
    return (d ? `${d}<u>${u[0]}</u>` : '') + `${pad(h)}:${pad(m)}:${pad(s % 60)}`;
  }

  /* ---------- Таблица расписания ---------- */
  function renderTable() {
    const S = Z.cfg.schedule || {}, tz = Z.cfg.site.homeTimezone || 'Europe/Moscow';
    const same = tzOffset(new Date(), tz) === tzOffset(new Date(), VISITOR_TZ);
    const occ = occurrences(), byStream = new Map(occ.map(o => [o.s, o]));
    const rows = [...(S.streams || [])].sort((a, b) => a.day - b.day || String(a.time).localeCompare(String(b.time)));
    const tbl = Z.$('#sched'); tbl.textContent = '';
    // расписания нет — одна строка «расписание уточняется»
    if (!rows.length) {
      const tr = document.createElement('tr'), td = document.createElement('td');
      td.className = 'tbd'; td.textContent = Z.t('scheduleTbd'); tr.appendChild(td); tbl.appendChild(tr);
      Z.$('#tz').hidden = true; return;
    }
    for (const s of rows) {
      const tr = document.createElement('tr'), o = byStream.get(s);
      const th = document.createElement('th'); th.scope = 'row'; th.textContent = Z.t('days')[s.day - 1] || '?';
      const td = document.createElement('td'); td.textContent = `${s.time} ${Z.t('home')}`;
      const note = Z.L(s.note); if (note) { const n = document.createElement('span'); n.className = 'note'; n.textContent = note; td.appendChild(n); }
      tr.append(th, td);
      if (!same && o) { const l = document.createElement('td'); l.className = 'local'; l.textContent = `${Z.t('yours')} ${localWhen(o.start)}`; tr.appendChild(l); }
      tbl.appendChild(tr);
    }
    Z.$('#tz').textContent = same ? '' : `${Z.t('tzNote')} (${VISITOR_TZ})`;
    Z.$('#tz').hidden = same;
  }

  /* ---------- Таймер и строка статуса ---------- */
  function renderTimer() {
    const box = Z.$('#timer');
    if ((Z.cfg.blocks || {}).timer === false) { box.hidden = true; return; }
    const st = state(), now = Date.now(), L = Z.live || {};
    box.hidden = false;
    // ни даты дебюта, ни расписания — «БЛИЖАЙШИЙ СЕАНС: НЕИЗВЕСТНО»
    if (st.kind === 'none' && !L.live) {
      box.classList.add('live');
      box.innerHTML = '<small></small><b></b>';
      box.firstChild.textContent = Z.t('timerUnknown'); box.lastChild.textContent = Z.t('nextUnknown').toUpperCase();
      return;
    }
    // стрим точно идёт (узнал live.js) — или по расписанию должен идти, а проверить не удалось
    const text = L.live ? Z.t('timerLive') : (st.kind === 'window' && !(L.checked && st.nextAt)) ? Z.t('timerWindow') : '';
    box.classList.toggle('live', !!text);
    if (text) { box.innerHTML = '<b></b>'; box.firstChild.textContent = text; return; }
    // проверили — сейчас не идёт: считаем до следующего сеанса
    const at = st.kind === 'window' ? st.nextAt : st.at;
    box.innerHTML = `<small>${st.kind === 'debut' ? Z.t('timerDebut') : Z.t('timerNext')}</small><b>${countdown(at - now)}</b>`;
  }
  // строка под ником: «● В ЭФИРЕ» (если live.js узнал, что стрим идёт) или «СИГНАЛ ОЖИДАЕТСЯ · ближайший сеанс: …»
  Z.renderStatus = function () {
    const el = Z.$('#status');
    if (Z.live && Z.live.live) {
      el.className = 'status live';
      el.innerHTML = `<i aria-hidden="true">●</i> <span></span> <a></a>`;
      el.querySelector('span').textContent = Z.t('statusLive');
      const a = el.querySelector('a'); a.textContent = Z.t('statusWatch'); a.href = Z.live.url || '#';
      a.target = '_blank'; a.rel = 'noopener';
      return;
    }
    el.className = 'status wait';
    const st = state();
    el.textContent = Z.t('statusWait');
    const n = document.createElement('span'); n.className = 'next';
    n.textContent = `${Z.t('statusNext')} ${st.kind === 'none' ? Z.t('nextUnknown') : localWhen(st.at)}`;
    el.appendChild(n);
  };

  // для терминала: «пт, 20:00» ближайшего сеанса (или дебюта)
  function nextText() {
    const st = state();
    const at = st.kind === 'window' ? (Z.live && Z.live.checked && !Z.live.live ? st.nextAt : st.at) : st.at;
    return at ? localWhen(at) : Z.t('nextUnknown');
  }
  Z.schedule = { state, occurrences, nextText };

  function renderAll() { renderTable(); renderTimer(); Z.renderStatus(); }
  function init() {
    renderAll();
    let lastMin = -1;
    setInterval(() => {
      renderTimer();
      const m = new Date().getMinutes();
      if (m !== lastMin) { lastMin = m; renderTable(); Z.renderStatus(); }   // раз в минуту — на случай, если сеанс начался/закончился
    }, 1000);
    document.addEventListener('zaren:lang', renderAll);
  }
  if (Z.cfg) init(); else document.addEventListener('zaren:ready', init, { once: true });
})();
