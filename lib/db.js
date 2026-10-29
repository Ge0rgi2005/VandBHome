const { neon } = require('@neondatabase/serverless');

let _sql;
function getSql() {
  if (!process.env.DATABASE_URL) throw new Error('Липсва променлива DATABASE_URL');
  return (_sql = _sql || neon(process.env.DATABASE_URL));
}

// Примерни обяви – вмъкват се само при първото създаване на таблицата
const SEED = [
  ['Двустаен, Лозенец', 'София', '2-стаен · 68 м² · 4 ет.', 168000],
  ['Тристаен, Младост 3', 'София', '3-стаен · 94 м² · 6 ет.', 142000],
  ['Къща с двор, Бояна', 'София', 'Къща · 210 м² · 2 000 м² двор', 420000],
  ['Едностаен, Тракия', 'Пловдив', '1-стаен · 46 м² · 3 ет.', 69000],
  ['Тристаен, Център', 'Пловдив', '3-стаен · 102 м² · 2 ет.', 155000],
  ['Апартамент, Бриз', 'Варна', '2-стаен · 74 м² · 5 ет.', 132000],
  ['Къща, Виница', 'Варна', 'Къща · 160 м² · гледка море', 295000],
  ['Двустаен, Сарафово', 'Бургас', '2-стаен · 63 м² · 1 ет.', 88000],
];

let ready;
function ensureSchema() {
  if (ready) return ready;
  ready = (async () => {
    const sql = getSql();
    const [{ exists }] = await sql`SELECT to_regclass('public.properties') IS NOT NULL AS exists`;
    if (exists) return;
    await sql`
      CREATE TABLE IF NOT EXISTS properties (
        id         SERIAL PRIMARY KEY,
        title      TEXT        NOT NULL,
        city       TEXT        NOT NULL,
        details    TEXT        NOT NULL DEFAULT '',
        price      INTEGER     NOT NULL CHECK (price >= 0),
        image_url  TEXT        NOT NULL DEFAULT '',
        published  BOOLEAN     NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )`;
    for (const [title, city, details, price] of SEED) {
      await sql`INSERT INTO properties (title, city, details, price) VALUES (${title}, ${city}, ${details}, ${price})`;
    }
  })();
  ready.catch(() => { ready = null; });
  return ready;
}

module.exports = { getSql, ensureSchema };
