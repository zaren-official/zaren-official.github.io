/* =====================================================================
   Пасхалка: скрытый терминал.
   Открывается клавишей «~» (на русской раскладке — «Ё») или 5 тапами по символу Зарена.
   Все тексты — в data/terminal.json (грузится только при первом открытии).
   ===================================================================== */
'use strict';
(function () {
  let T = null, box, out, input, lastFocus = null, typing = Promise.resolve(), hist = [], hi = 0;
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const tx = () => T[Z.lang] || T.ru;

  /* ---------- Окно терминала ---------- */
  function build() {
    box = document.createElement('div');
    box.className = 'term'; box.hidden = true;
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    box.innerHTML = `<div class="term-win">
        <div class="term-bar"><span class="term-title"></span><button type="button" class="term-x">✕</button></div>
        <div class="term-out" aria-live="polite"></div>
        <form class="term-line"><label><span class="term-prompt"></span><input type="text" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="send"></label></form>
      </div>`;
    document.body.appendChild(box);
    out = box.querySelector('.term-out'); input = box.querySelector('input');
    box.querySelector('.term-x').addEventListener('click', close);
    box.addEventListener('click', e => { if (e.target === box) close(); });         // тап мимо окна — закрыть
    box.querySelector('form').addEventListener('submit', e => { e.preventDefault(); run(input.value); input.value = ''; });
    input.addEventListener('keydown', e => {
      if (e.key === 'ArrowUp' && hist.length) { hi = Math.max(0, hi - 1); input.value = hist[hi]; e.preventDefault(); }
      if (e.key === 'ArrowDown' && hist.length) { hi = Math.min(hist.length, hi + 1); input.value = hist[hi] || ''; e.preventDefault(); }
    });
    box.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {                                 // фокус не уходит из окна
        const f = [input, box.querySelector('.term-x')], i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
  }
  function labels() {
    const t = tx();
    box.setAttribute('aria-label', t.title);
    box.querySelector('.term-title').textContent = t.title;
    box.querySelector('.term-x').setAttribute('aria-label', t.close);
    box.querySelector('.term-prompt').textContent = t.prompt + ' ';
    input.setAttribute('aria-label', t.inputLabel);
  }

  async function open() {
    if (box && !box.hidden) return;
    if (!T) {
      try { T = await (await fetch('data/terminal.json', { cache: 'no-cache' })).json(); }
      catch (e) { console.error('terminal.json не загрузился:', e); return; }
    }
    if (!box) build();
    labels();
    lastFocus = document.activeElement;
    box.hidden = false; document.body.classList.add('term-open');
    input.focus();
    if (!out.childElementCount) print(tx().welcome, true);
  }
  function close() {
    if (!box || box.hidden) return;
    box.hidden = true; document.body.classList.remove('term-open');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* ---------- Вывод: строки печатаются телетайпом ---------- */
  function lineClass(s) {
    if (/^\[ECHO\]/.test(s)) return 'echo';
    if (/^(АРХАНГЕЛ|ARCHANGEL):/.test(s)) return 'hi';
    return '';
  }
  function fill(s, cmd) {
    return s.replace('{cmd}', cmd || '')
      .replace('{status}', Z.live && Z.live.live ? Z.t('statusLive') : Z.t('statusWait'))
      .replace('{next}', Z.schedule ? Z.schedule.nextText() : '—');
  }
  function print(lines, instant = false, cls = '') {
    typing = typing.then(async () => {
      for (const s of lines) {
        const p = document.createElement('p'); p.className = cls || lineClass(s);
        out.appendChild(p);
        if (instant || Z.reducedMotion) p.textContent = s;
        else for (let i = 0; i < s.length; i += 2) { p.textContent = s.slice(0, i + 2); out.scrollTop = out.scrollHeight; await sleep(12); }
        out.scrollTop = out.scrollHeight;
      }
    });
    return typing;
  }

  /* ---------- Команды ---------- */
  function run(raw) {
    const t = tx(), cmd = String(raw || '').trim().toLowerCase();
    print([`${t.prompt} ${raw}`], true, 'cmd');
    if (!cmd) return;
    hist.push(cmd); hi = hist.length;
    const name = t.aliases[cmd] || cmd, c = t.commands[name];
    if (!c) return print([fill(t.unknown, cmd)], false, 'err');
    if (c.action === 'clear') { typing = typing.then(() => { out.textContent = ''; }); return; }
    if (c.action === 'exit') return close();
    if (c.action === 'echo') echoStorm();
    let lines = c.text || [];
    if (c.random) lines = c.random[Math.floor(Math.random() * c.random.length)];
    // help: список открытых команд с описаниями
    const list = Object.entries(t.commands).filter(([, v]) => !v.hidden).map(([k, v]) => `  ${k.padEnd(10)} — ${v.desc || ''}`);
    lines = lines.flatMap(s => s === '{list}' ? list : [fill(s, cmd)]);
    print(lines);
  }

  // команда echo: фиолетовый глитч всей страницы на 1 секунду
  function echoStorm() {
    if (Z.reducedMotion) return;
    document.body.classList.remove('echo-storm'); void document.body.offsetWidth;
    document.body.classList.add('echo-storm');
    setTimeout(() => document.body.classList.remove('echo-storm'), 1000);
  }

  /* ---------- Как открыть ---------- */
  function init() {
    if ((Z.cfg.blocks || {}).terminal === false) return;
    Z.$('#termHint').hidden = false;
    document.addEventListener('keydown', e => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;      // в поле ввода «ё» — это буква; закрыть — Esc или exit
      // «~» и «`» (физическая клавиша слева от 1; на русской раскладке это «Ё»)
      if (e.code === 'Backquote' || e.key === '~' || e.key === '`') {
        e.preventDefault();
        if (box && !box.hidden) close(); else open();
      }
    });
    // телефоны: 5 тапов по символу за 3 секунды
    let taps = [];
    const sym = Z.$('#sym');
    sym.addEventListener('click', () => {
      const now = Date.now(); taps = taps.filter(t => now - t < 3000); taps.push(now);
      sym.classList.remove('tap'); void sym.getBoundingClientRect(); sym.classList.add('tap');
      if (taps.length >= 5) { taps = []; open(); }
    });
    document.addEventListener('zaren:lang', () => { if (box) labels(); });
  }
  Z.terminal = { open, close, run };
  if (Z.cfg) init(); else document.addEventListener('zaren:ready', init, { once: true });
})();
