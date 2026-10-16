/* =====================================================================
   Аватар: пиксельный спрайт (assets/avatar.png) + кадр моргания (assets/avatar-blink.png).
   Иногда моргает, изредка — короткий фиолетовый глитч ЭХО.
   Пока картинки нет — показывается силуэт-заглушка (он тоже моргает и глючит).
   При «уменьшить движение» в настройках системы — без моргания и глитчей.
   ===================================================================== */
'use strict';
(function () {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const load = src => new Promise(res => { if (!src) return res(null); const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });

  async function init() {
    if ((Z.cfg.blocks || {}).avatar === false) return;
    const A = Z.cfg.avatar || {}, view = Z.$('#camView');
    const [main, blink] = await Promise.all([load(A.image), load(A.blink)]);

    let doBlink;
    if (main) {
      // спрайт найден: два кадра друг на друге, моргание — показать второй на мгновение
      view.querySelector('.avatar-ph').remove();
      main.className = 'sprite'; main.alt = ''; main.draggable = false;
      view.appendChild(main);
      if (blink) {
        blink.className = 'sprite blink'; blink.alt = ''; blink.draggable = false;
        view.appendChild(blink);
        doBlink = () => { blink.classList.add('on'); setTimeout(() => blink.classList.remove('on'), 140); };
      }
      if (A.pixelated === false) view.classList.add('smooth');
    } else {
      // заглушка: «глаза» на силуэте закрываются
      const ph = view.querySelector('.avatar-ph');
      doBlink = () => { ph.classList.add('blinking'); setTimeout(() => ph.classList.remove('blinking'), 140); };
    }
    if (Z.reducedMotion) return;

    // моргание раз в 2.5–6 сек, иногда двойное
    (function nextBlink() {
      setTimeout(() => {
        if (doBlink && !document.hidden) { doBlink(); if (Math.random() < .2) setTimeout(doBlink, 260); }
        nextBlink();
      }, rnd(2500, 6000));
    })();
    // редкий фиолетовый глитч ЭХО раз в 15–35 сек
    (function nextGlitch() {
      setTimeout(() => {
        if (!document.hidden) { view.classList.remove('glitch'); void view.offsetWidth; view.classList.add('glitch'); }
        nextGlitch();
      }, rnd(15000, 35000));
    })();
    view.addEventListener('animationend', e => { if (e.animationName === 'camGlitch') view.classList.remove('glitch'); });
  }
  if (Z.cfg) init(); else document.addEventListener('zaren:ready', init, { once: true });
})();
