# Деплой ainativemaker.com

Общая спецификация и текущий статус проекта: `SPEC.md`.

## Где живёт сайт

С 09.09.2026 продакшен на американском сервере: SSH-алиас `srv188` (он же
`synteq`), IP `167.17.73.188`, Dallas, Ubuntu 22.04, веб-сервер **Caddy**.
Сервер общий: на нём же 111.bz, dim.im, startupfounderai.com и панель t.dim.im.
Чужие блоки Caddyfile не трогать.

- статика: `/srv/ainativemaker/releases/<timestamp>`, активный —
  симлинк `/srv/ainativemaker/current`;
- Caddy: блок в `/etc/caddy/Caddyfile`, локальный эталон
  `deploy/caddy-ainativemaker.conf`; сертификаты Caddy выпускает и продлевает сам;
- API формы и админка: `/opt/ainativemaker-server/current/server/index.mjs`,
  слушает `127.0.0.1:8787`;
- systemd: `ainativemaker.service`, эталон `deploy/ainativemaker.service`;
- заявки: `/var/lib/ainativemaker/leads.jsonl`;
- метаданные заявок: `/var/lib/ainativemaker/lead-statuses.json`;
- учётные данные админки: `/etc/ainativemaker-admin.env`, права `600`;
- сборка: `dist/` после `npm run build && npm run check && npm test`.

Текущий релиз: `20261006-102029` (дневник на обоих языках, свежие записи первыми, 125 записей в каждой версии). Предыдущий релиз для отката: `20261005-080658`. Проверено 06.10.2026: Caddy и `ainativemaker.service` активны; четыре HTML-маршрута, оба JSON и `llms.txt` побайтно совпадают с локальной сборкой; HTTPS, редиректы и честный 404 работают. Настольный Chromium 151, 1440×900: нет JS-исключений и горизонтального переполнения. Сторонние запросы Метрики в изолированном браузере дали ошибку сертификата. Мобильная не проверялась.

### Прежний сервер

Русский VPS `prokovki` (`185.26.120.84`, nginx + certbot) больше не принимает
трафик: A-записи переключены 09.09.2026. Файлы, заявки и nginx-конфиг там
оставлены как есть — это откат на случай проблем. Эталон nginx сохранён в
`deploy/nginx.conf`. Две заявки и файл статусов скопированы на новый сервер.

## DNS

Домен зарегистрирован в Namecheap, зона обслуживается Cloudflare
(`dawn.ns`/`pablo.ns`). Зоной управляет токен `~/.config/cloudflare/mail-token`.

- `A` для `@` → `167.17.73.188`, без проксирования;
- `A` для `www` → `167.17.73.188`, без проксирования;
- MX, DKIM, SPF, DMARC и SRV указывают на `mail.111.bz` — почтовые записи
  при переездах сайта не трогать.

## Выпуск нового релиза

Только по отдельной явной команде владельца.

```bash
npm run build && npm run check && npm test
TS=$(date +%Y%m%d-%H%M%S)
rsync -a --delete dist/ srv188:/srv/ainativemaker/releases/$TS/
ssh srv188 "ln -sfn /srv/ainativemaker/releases/$TS /srv/ainativemaker/current"
```

Если менялся `server/`, загружать весь каталог: `index.mjs` импортирует
`admin-ui.mjs`. Файлы данных в релиз не входят и не перезаписываются.

```bash
rsync -a server/ srv188:/opt/ainativemaker-server/current/server/
ssh srv188 "systemctl restart ainativemaker && systemctl is-active ainativemaker"
```

При изменении Caddy-блока: скопировать эталон в `/etc/caddy/Caddyfile`,
затем `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` и
`systemctl reload caddy`. Хранить текущий и один предыдущий релиз.

## Переиндексация

После выпуска дёрнуть IndexNow (Bing, Яндекс; ключ — `deploy/indexnow.key`,
файл `dist/<ключ>.txt` кладёт сборка):

```bash
KEY=$(cat deploy/indexnow.key); curl -s -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json' \
  -d "{\"host\":\"ainativemaker.com\",\"key\":\"$KEY\",\"urlList\":[\"https://ainativemaker.com/\",\"https://ainativemaker.com/ru/\",\"https://ainativemaker.com/ai/\",\"https://ainativemaker.com/ru/ai/\"]}" -w '%{http_code}\n'
```

Google пинг сайтмапа не принимает с 2023 года: только Search Console —
владелец сайта добавляет ресурс `ainativemaker.com`, отправляет
`sitemap.xml` и жмёт «Запросить индексирование» для `/` и `/ru/`. Пока этого
не сделано, в выдаче висит старая парковка Namecheap («is registered at
Namecheap»), проиндексированная до запуска сайта.

## Проверка после выпуска

`/` (en), `/ru/` (ru), `/ai/`, `/ru/ai/`, `/journal.json`, `/journal.en.json`, `/llms.txt`, `/site.webmanifest`, `/favicon.ico`,
`/favicon.svg`, `/apple-touch-icon.png`, `/robots.txt`, `/sitemap.xml`,
`/og-image.png`, `/admin/` (своя форма входа), `POST /api/leads` (валидация),
`404` на несуществующем URL, редиректы `http` и `www` на
`https://ainativemaker.com`, Telegram-ссылка, canonical и hreflang на всех четырёх страницах, число записей дневника
(187 в русской версии, больше — в английской: туда идут новые записи)
и отсутствие горизонтального переполнения на 360, 390, 430, 768, 1024 и 1440 px.

## Откат

```bash
ssh srv188 "ls /srv/ainativemaker/releases"
ssh srv188 "ln -sfn /srv/ainativemaker/releases/<предыдущий> /srv/ainativemaker/current"
```

Полный откат на прежний сервер — вернуть обе A-записи на `185.26.120.84`.


### Прежний сервер

Русский VPS `prokovki` (`185.26.120.84`, nginx + certbot) больше не принимает
трафик: A-записи переключены 09.09.2026. Файлы, заявки и nginx-конфиг там
оставлены как есть — это откат на случай проблем. Эталон nginx сохранён в
`deploy/nginx.conf`. Две заявки и файл статусов скопированы на новый сервер.

## DNS

Домен зарегистрирован в Namecheap, зона обслуживается Cloudflare
(`dawn.ns`/`pablo.ns`). Зоной управляет токен `~/.config/cloudflare/mail-token`.

- `A` для `@` → `167.17.73.188`, без проксирования;
- `A` для `www` → `167.17.73.188`, без проксирования;
- MX, DKIM, SPF, DMARC и SRV указывают на `mail.111.bz` — почтовые записи
  при переездах сайта не трогать.

## Выпуск нового релиза

Только по отдельной явной команде владельца.

```bash
npm run build && npm run check && npm test
TS=$(date +%Y%m%d-%H%M%S)
rsync -a --delete dist/ srv188:/srv/ainativemaker/releases/$TS/
ssh srv188 "ln -sfn /srv/ainativemaker/releases/$TS /srv/ainativemaker/current"
```

Если менялся `server/`, загружать весь каталог: `index.mjs` импортирует
`admin-ui.mjs`. Файлы данных в релиз не входят и не перезаписываются.

```bash
rsync -a server/ srv188:/opt/ainativemaker-server/current/server/
ssh srv188 "systemctl restart ainativemaker && systemctl is-active ainativemaker"
```

При изменении Caddy-блока: скопировать эталон в `/etc/caddy/Caddyfile`,
затем `caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile` и
`systemctl reload caddy`. Хранить текущий и один предыдущий релиз.

## Переиндексация

После выпуска дёрнуть IndexNow (Bing, Яндекс; ключ — `deploy/indexnow.key`,
файл `dist/<ключ>.txt` кладёт сборка):

```bash
KEY=$(cat deploy/indexnow.key); curl -s -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json' \
  -d "{\"host\":\"ainativemaker.com\",\"key\":\"$KEY\",\"urlList\":[\"https://ainativemaker.com/\",\"https://ainativemaker.com/ru/\",\"https://ainativemaker.com/ai/\",\"https://ainativemaker.com/ru/ai/\"]}" -w '%{http_code}\n'
```

Google пинг сайтмапа не принимает с 2023 года: только Search Console —
владелец сайта добавляет ресурс `ainativemaker.com`, отправляет
`sitemap.xml` и жмёт «Запросить индексирование» для `/` и `/ru/`. Пока этого
не сделано, в выдаче висит старая парковка Namecheap («is registered at
Namecheap»), проиндексированная до запуска сайта.

## Проверка после выпуска

`/` (en), `/ru/` (ru), `/ai/`, `/ru/ai/`, `/journal.json`, `/journal.en.json`, `/llms.txt`, `/site.webmanifest`, `/favicon.ico`,
`/favicon.svg`, `/apple-touch-icon.png`, `/robots.txt`, `/sitemap.xml`,
`/og-image.png`, `/admin/` (своя форма входа), `POST /api/leads` (валидация),
`404` на несуществующем URL, редиректы `http` и `www` на
`https://ainativemaker.com`, Telegram-ссылка, canonical и hreflang на всех четырёх страницах, число записей дневника
(187 в русской версии, больше — в английской: туда идут новые записи)
и отсутствие горизонтального переполнения на 360, 390, 430, 768, 1024 и 1440 px.

## Откат

```bash
ssh srv188 "ls /srv/ainativemaker/releases"
ssh srv188 "ln -sfn /srv/ainativemaker/releases/<предыдущий> /srv/ainativemaker/current"
```

Полный откат на прежний сервер — вернуть обе A-записи на `185.26.120.84`.
