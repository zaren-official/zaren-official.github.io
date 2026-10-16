# ZAREN_01 — сайт-визитка

Одностраничный сайт в стиле CRT-терминала: ссылки на площадки, статус эфира, расписание с пересчётом часовых поясов, таймер, аватар и скрытый терминал-пасхалка. Чистые HTML/CSS/JS без сборки — заливается на GitHub Pages как есть.

## Что где лежит

```
index.html            разметка страницы и мета-теги для превью
404.html              страница «СИГНАЛ ПОТЕРЯН»
css/style.css         весь внешний вид
js/main.js            загрузка настроек, язык, ссылки, подвал
js/schedule.js        расписание, часовые пояса, таймер, строка статуса
js/live.js            проверка «в эфире» на Twitch
js/avatar.js          спрайт, моргание, глитч
js/terminal.js        скрытый терминал
data/config.json      ← ВСЕ настройки и тексты сайта
data/terminal.json    ← тексты терминала
assets/               картинки, значки, шрифты
```

Почти всё меняется в двух файлах — `data/config.json` и `data/terminal.json`. Код трогать не нужно.

## Как поменять ссылки

`data/config.json` → массив `links`. Одна кнопка — одна строка:

```json
{ "id": "twitch", "enabled": true, "url": "https://www.twitch.tv/ваш_ник", "icon": "twitch", "title": "Twitch", "label": { "ru": "эфиры", "en": "live streams" } }
```

- `url` — ссылка (сейчас везде заглушки `#`).
- `enabled: false` — кнопка скрыта. Так сейчас выключены Discord, Boosty и мод для Voices of the Void.
- `label` — подпись под названием на двух языках.
- `icon` — значок: `twitch`, `youtube`, `tiktok`, `telegram`, `discord`, `donate`, `boosty`, `antenna`, `link`.
- Порядок кнопок на сайте = порядок в файле.

## Остальные настройки `config.json`

| Что | Где |
|---|---|
| Почта для сотрудничества, ссылка на исходники | `site.email`, `site.sourceUrl` |
| Ник на Twitch (для статуса «В ЭФИРЕ») | `site.twitchChannel` |
| Дата дебюта (до неё таймер считает до дебюта) | `debut`, формат `"2026-11-01T20:00:00+03:00"` |
| Расписание | `schedule.streams`: `day` — 1 пн … 7 вс, `time` — по МСК, `note` — подпись. `streamHours` — сколько обычно длится эфир |
| Показывать/скрывать блоки | `blocks`: `avatar`, `about`, `links`, `schedule`, `timer`, `liveStatus`, `terminal` — `true`/`false` |
| Все тексты страницы на двух языках | `texts.ru` и `texts.en` |
| Аватар | `avatar` — пути к картинкам (см. ниже) |

После дебюта таймер сам переключится на «ДО СЛЕДУЮЩЕГО СЕАНСА» по расписанию. Если время сеанса по расписанию наступило, а Twitch проверить не удалось, будет написано «СЕАНС ПО РАСПИСАНИЮ — СЕЙЧАС».

> В JSON нельзя ставить запятую после последнего элемента и нужны двойные кавычки. Если после правки страница пишет «config.json не загрузился» — проверьте файл на https://jsonlint.com.

## Аватар

Положите в `assets/`:
- `avatar.png` — спрайт с открытыми глазами;
- `avatar-blink.png` — тот же спрайт с закрытыми глазами, того же размера.

Спрайт растягивается «по пикселям» без размытия, поэтому подойдёт маленький, например 64×64. Для обычной, не пиксельной картинки поставьте `"pixelated": false`. Нет второго кадра — просто не будет моргания. Нет картинок совсем — показывается силуэт-заглушка.

## Скрытый терминал

Открывается клавишей `~` (на русской раскладке это `Ё`) или пятью быстрыми тапами по символу в шапке — для телефонов. Закрывается `Esc`, командой `exit` или кнопкой ✕.

Тексты — `data/terminal.json`, отдельно для `ru` и `en`:
- `"text": [...]` — строки выводятся по порядку;
- `"random": [[...], [...]]` — каждый раз выводится одна случайная запись;
- `"hidden": true` — команды нет в `help`, её надо угадать. Сейчас скрыты `aurorium`, `5629`, `zaren`, `cryo`, `sudo`;
- `aliases` — русские синонимы команд (`помощь` → `help`);
- подстановки: `{next}` — ближайший сеанс, `{status}` — в эфире или нет;
- строка, начинающаяся с `[ECHO]`, красится фиолетовым, с `АРХАНГЕЛ:` — подсветкой.

Новую команду добавить просто: скопируйте любую и поменяйте имя и текст.

## Посмотреть сайт у себя на компьютере

Двойной клик по `index.html` не сработает: браузер не даёт странице читать `config.json` с диска. Нужен маленький локальный сервер. Откройте терминал в папке сайта и выполните:

```bash
python -m http.server 8000
```

Затем откройте в браузере http://localhost:8000.

## Публикация на GitHub Pages

Аккаунт: `zaren-official`.

1. На GitHub создайте репозиторий с именем **`zaren-official.github.io`**. Тогда сайт откроется прямо по адресу `https://zaren-official.github.io/`, без хвоста в адресе. На это рассчитаны превью и страница 404.
2. Отправьте туда файлы. Из папки сайта:
   ```bash
   git remote add origin https://github.com/zaren-official/zaren-official.github.io.git
   git push -u origin main
   ```
   При первом `push` откроется окно входа в GitHub — войдите в аккаунт `zaren-official`.
3. На GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch**, ветка `main`, папка `/ (root)` → **Save**.
4. Через 1–2 минуты сайт будет на `https://zaren-official.github.io/`.

Дальше после каждой правки: `git add -A`, `git commit -m "что поменял"`, `git push`. GitHub Pages кэширует файлы примерно на 10 минут, поэтому изменения у посетителей появляются не мгновенно.

## Как подключить домен zaren.space

1. В корне сайта создайте файл `CNAME` с одной строкой: `zaren.space`. Отправьте его на GitHub.
2. У регистратора домена в настройках DNS добавьте:
   - четыре записи **A** для `zaren.space` (`@`): `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`;
   - по желанию четыре **AAAA**: `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`;
   - **CNAME** для `www` → `zaren-official.github.io`.
3. На GitHub: **Settings → Pages → Custom domain** → `zaren.space` → Save. Когда проверка пройдёт (DNS обновляется от нескольких минут до суток), включите **Enforce HTTPS**.
4. В `index.html` замените `https://zaren-official.github.io/` на `https://zaren.space/` в строках `og:url` и `og:image` — это превью ссылки в Telegram и Discord.

Чтобы домен не увели через GitHub, его можно подтвердить: **Settings (профиля) → Pages → Add a domain**.

## Статус «В ЭФИРЕ»

Официальному API Twitch нужен секретный ключ. Положить его в код статичного сайта нельзя: его увидит любой посетитель. Поэтому:

- **Сейчас** сайт раз в 2 минуты спрашивает публичный сервис **DecAPI** (`decapi.me`). Он отвечает без ключа, идёт ли эфир. Если сервис не ответил за 4 секунды или вернул ошибку, на странице просто остаётся расписание, ничего не ломается. Учтите, что DecAPI видит IP посетителей, как любой сторонний сервер. Выключить проверку: `blocks.liveStatus: false`.
- **Надёжнее** — свой маленький сервер с ключом, бесплатно на Cloudflare Workers:
  1. Зарегистрируйте приложение на https://dev.twitch.tv/console/apps и получите Client ID и Client Secret.
  2. На https://dash.cloudflare.com → Workers → Create, вставьте код ниже. В Settings → Variables добавьте секреты `TWITCH_CLIENT_ID` и `TWITCH_CLIENT_SECRET`.
  3. В `config.json` пропишите `"live": { "endpoint": "https://ваш-воркер.workers.dev/?channel={channel}" }`.

  ```js
  // Cloudflare Worker: отвечает {"live": true|false}. Ключи — в секретах воркера, не в коде сайта.
  export default {
    async fetch(req, env, ctx) {
      const cache = caches.default, hit = await cache.match(req);
      if (hit) return hit;                                        // ответ кэшируется на минуту
      const ch = (new URL(req.url).searchParams.get('channel') || '').toLowerCase();
      const tok = await (await fetch('https://id.twitch.tv/oauth2/token', { method: 'POST',
        body: new URLSearchParams({ client_id: env.TWITCH_CLIENT_ID, client_secret: env.TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' }) })).json();
      const r = await fetch('https://api.twitch.tv/helix/streams?user_login=' + encodeURIComponent(ch),
        { headers: { 'Client-Id': env.TWITCH_CLIENT_ID, 'Authorization': 'Bearer ' + tok.access_token } });
      const live = ((await r.json()).data || []).length > 0;
      const res = new Response(JSON.stringify({ live }), { headers: { 'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', 'Cache-Control': 'max-age=60' } });
      ctx.waitUntil(cache.put(req, res.clone()));
      return res;
    },
  };
  ```

  Код воркера пока не проверялся на настоящем ключе.

## Превью ссылки в мессенджерах

Картинка — `assets/og-image.png` (1200×630), тексты — строки `og:` в начале `index.html`. Telegram запоминает превью. Чтобы обновить его после правок, отправьте ссылку боту @WebpageBot.

## Доступность и «меньше движения»

Если в системе включено «уменьшить движение», мигание, глитчи и печать текста отключаются. У всех кнопок виден фокус с клавиатуры, у значков есть подписи для экранных дикторов.

## Шрифты и лицензии

Pixelify Sans и VT323 лежат в `assets/fonts/` (SIL Open Font License, см. `assets/fonts/OFL.txt`). Сайт не обращается к Google Fonts и не содержит трекеров и аналитики.
