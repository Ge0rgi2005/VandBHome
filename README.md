# VandBHome

Демонстрационен сайт на **измислената** брокерска фирма VandBHome. Вдъхновен от структурата на сайтове за директен откуп и продажба на имоти, със собствен дизайн (петролено синьо и шафранено жълто, шрифт Onest), админ панел и база данни Neon (Postgres), хостван във Vercel.

## Какво има

- `/` – публичният сайт с двустъпкова форма, оферти, статистики, филтрируеми обяви, отзиви, ново строителство, въпроси и контакти. Обявите се зареждат от базата през `/api/properties`; при липса на API се показват примерни данни.
- `/admin` – админ панел за добавяне, редактиране, скриване/показване, изтриване и търсене на имоти.
- `api/properties.js` – CRUD API (четенето е публично, промените изискват вход).
- `api/auth.js` – вход/изход с парола и подписана HttpOnly сесия за 7 дни.
- `lib/db.js` – връзка с Neon; при първо стартиране създава таблица `properties` и я пълни с примерни имоти.

## Инсталиране във Vercel + Neon

1. Качи проекта в GitHub и го импортирай във Vercel (Framework Preset: **Other**).
2. Във Vercel свържи Neon от **Storage / Integrations → Neon**. Това добавя `DATABASE_URL` автоматично.
3. В **Settings → Environment Variables** добави:
   - `ADMIN_PASSWORD` – дълга и уникална парола за админ панела;
   - `ADMIN_SECRET` – по желание, отделен таен низ за подписване на сесиите.
4. Redeploy и отвори `/admin` на сайта си.

Примерът за променливите е в [`.env.example`](.env.example).

## Локално стартиране

```bash
npm i -g vercel
npm install
vercel link && vercel env pull .env.local   # изтегля DATABASE_URL от Vercel
# добави ADMIN_PASSWORD и при нужда ADMIN_SECRET в .env.local
vercel dev
```

За статичен преглед без бекенд отвори `index.html` или стартирай `python3 -m http.server`. В този режим се показват примерни обяви, а формата не изпраща данни.

## Таблица `properties`

| колона | тип |
|---|---|
| id | SERIAL, PK |
| title | TEXT |
| city | TEXT |
| details | TEXT |
| price | INTEGER (€) |
| image_url | TEXT (по желание, http/https) |
| published | BOOLEAN |
| created_at | TIMESTAMPTZ |

## Бележки

- GitHub Pages не изпълнява `api/` функции – за пълната функционалност използвай Vercel.
- Всички имена, цени, телефони и отзиви са измислени. Формата за запитване не изпраща данни.
