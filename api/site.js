const { getSql, ensureSchema } = require('../lib/db');
const { isAdmin } = require('../lib/auth');
const { DEFAULTS, merge } = require('../lib/site');

// GET /api/site -> цялото редактируемо съдържание (по подразбиране + промените от админа)
// PUT /api/site (админ) -> записва съдържанието; DELETE (админ) -> връща стойностите по подразбиране
module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql`SELECT value FROM settings WHERE key = 'site'`;
      res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60');
      return res.status(200).json(merge(rows.length ? rows[0].value : null));
    }

    if (!isAdmin(req)) return res.status(401).json({ error: 'Нужен е вход в админ панела.' });
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'PUT') {
      const doc = merge(req.body);
      const json = JSON.stringify(doc);
      if (json.length > 400000) return res.status(413).json({ error: 'Съдържанието е твърде голямо.' });
      await sql`INSERT INTO settings (key, value, updated_at) VALUES ('site', ${json}::jsonb, now())
                ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
      return res.status(200).json(doc);
    }

    if (req.method === 'DELETE') {
      await sql`DELETE FROM settings WHERE key = 'site'`;
      return res.status(200).json(merge(null));
    }

    res.setHeader('Allow', 'GET, PUT, DELETE');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра.' });
  }
};
