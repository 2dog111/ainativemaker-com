# Деплой ainativemaker.com

Общая спецификация и инварианты проекта: `SPEC.md`.

## Production

Продакшен работает на сервере из реестра `~/antropic/SERVERS.md`: SSH-алиас
`srv188`, фактический hostname `vps111`, Caddy. Сервер общий, поэтому чужие
блоки `/etc/caddy/Caddyfile` не менять.

- статические релизы: `/srv/ainativemaker/releases/<timestamp>`;
- активный релиз: симлинк `/srv/ainativemaker/current`;
- локальный эталон блока Caddy: `deploy/caddy-ainativemaker.conf`;
- API и закрытая админка: `/opt/ainativemaker-server/current/server/index.mjs`;
- systemd: `ainativemaker.service`;
- заявки: `/var/lib/ainativemaker/leads.jsonl`;
- статусы заявок: `/var/lib/ainativemaker/lead-statuses.json`;
- секреты админки: `/etc/ainativemaker-admin.env`.

Активный релиз до текущего выпуска: `20261020-095059`. Предыдущий известный
релиз для отката: `20261008-120207`. Фактический активный путь всегда сверять
на сервере перед переключением.

Прежний VPS `prokovki` больше не принимает трафик. Его файлы, заявки и
конфигурация сохранены только как аварийный откат и этой процедурой не меняются.

## Локальный gate

```bash
npm run build
npm run lint
npm run typecheck
npm test
npm run check
npm run audit:diary
node /Users/sergeiriazanov/antropic/ii-agent-MODUL-web-03-10-26/bin/ii.js check dist --seo --min 70
```

Перед выпуском выполнить desktop QA в отдельном Chromium на 1440×900.
Мобильная проверка выполняется только по отдельной прямой команде владельца.

## Выпуск

Только по отдельной явной команде владельца.

```bash
TS=$(date +%Y%m%d-%H%M%S)
rsync -a --delete dist/ srv188:/srv/ainativemaker/releases/$TS/
ssh srv188 "ln -sfn /srv/ainativemaker/releases/$TS /srv/ainativemaker/current"
```

Если менялся Caddy-блок, сначала собрать временный полный Caddyfile на сервере,
проверить его `caddy validate`, затем заменить конфигурацию и выполнить
`systemctl reload caddy`. До проверки не переписывать рабочий Caddyfile.

Если менялся `server/`, загрузить каталог отдельно и перезапустить только
`ainativemaker.service`. Файлы данных и `/etc/ainativemaker-admin.env` в релиз
не входят и не перезаписываются.

## Переиндексация

После выпуска отправить в IndexNow только действующие канонические страницы:

```bash
KEY=$(cat deploy/indexnow.key); curl -s -X POST https://api.indexnow.org/indexnow -H 'Content-Type: application/json' \
  -d "{\"host\":\"ainativemaker.com\",\"key\":\"$KEY\",\"urlList\":[\"https://ainativemaker.com/\",\"https://ainativemaker.com/ai/\"]}" -w '%{http_code}\n'
```

В Google Search Console отправляется `/sitemap.xml`; устаревшие русские URL в
sitemap не возвращаются.

## Проверка после выпуска

- `200`: `/`, `/ai/`, `/journal.json`, `/llms.txt`, `/ai-info.md`,
  `/agent-context.json`, `/robots.txt`, `/sitemap.xml`, `/site.webmanifest`,
  `/favicon.ico`, `/favicon.svg`, `/apple-touch-icon.png`, `/og-image.png`;
- `308`: `/ru`, `/ru/*` → `/`, `/journal.en.json` → `/journal.json`;
- честный `404` на несуществующем URL;
- HTTP и `www` перенаправляются на `https://ainativemaker.com`;
- canonical, английский `lang`, отсутствие ссылки на русскую версию и кириллицы
  в публичной ленте;
- число, порядок, ID, даты и абзацы 125 записей совпадают с локальным `dist`;
- публичные файлы побайтно совпадают с локальной сборкой;
- `caddy validate`, Caddy и `ainativemaker.service` успешны;
- публичный `ii-agent check --seo` и `ii-agent diff site.json ... --verify`;
- desktop Chromium 1440×900: основной путь, переход на `/ai/`, focus,
  горизонтальное переполнение, консоль и сеть.

## Откат

```bash
ssh srv188 "ls -1 /srv/ainativemaker/releases"
ssh srv188 "ln -sfn /srv/ainativemaker/releases/<предыдущий> /srv/ainativemaker/current"
```

Если выпуск менял Caddy, вернуть сохранённую копию Caddyfile, повторить
`caddy validate` и только затем reload.
