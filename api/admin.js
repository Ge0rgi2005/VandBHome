const { getSql, ensureSchema, seedDemo } = require('../lib/db');
const { isAdmin } = require('../lib/auth');

// Само за админ: GET ?what=stats|leads|users · PATCH {id,status} · DELETE ?what=lead|user&id= · POST {action:"seed"}
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!isAdmin(req)) return res.status(401).json({ error: 'Нужен е вход в админ панела.' });
    await ensureSchema();
    const sql = getSql();
    const q = req.query || {};

    if (req.method === 'GET') {
      if (q.what === 'leads') {
        return res.status(200).json(await sql`
          SELECT l.id, l.kind, l.name, l.phone, l.email, l.type, l.city, l.message, l.status, l.created_at,
                 l.property_id, p.title AS property_title
          FROM leads l LEFT JOIN properties p ON p.id = l.property_id
          ORDER BY l.id DESC LIMIT 500`);
      }
      if (q.what === 'users') {
        return res.status(200).json(await sql`
          SELECT u.id, u.email, u.name, u.created_at, (SELECT count(*)::int FROM favorites f WHERE f.user_id = u.id) AS favorites
          FROM users u ORDER BY u.id DESC LIMIT 500`);
      }
      const [s] = await sql`
        SELECT (SELECT count(*)::int FROM properties) AS properties,
               (SELECT count(*)::int FROM properties WHERE published) AS published,
               (SELECT count(*)::int FROM leads WHERE status = 'new') AS new_leads,
               (SELECT count(*)::int FROM leads) AS leads,
               (SELECT count(*)::int FROM users) AS users`;
      return res.status(200).json(s);
    }

    if (req.method === 'PATCH') {
      const id = Number(req.body && req.body.id);
      const status = req.body && req.body.status === 'done' ? 'done' : 'new';
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      await sql`UPDATE leads SET status = ${status} WHERE id = ${id}`;
      return res.status(200).json({ ok: true, status });
    }

    if (req.method === 'DELETE') {
      const id = Number(q.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      if (q.what === 'lead') await sql`DELETE FROM leads WHERE id = ${id}`;
      else if (q.what === 'user') await sql`DELETE FROM users WHERE id = ${id}`;
      else return res.status(400).json({ error: 'Непознат обект.' });
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'POST' && req.body && req.body.action === 'seed') {
      return res.status(200).json({ added: await seedDemo() });
    }

    res.setHeader('Allow', 'GET, PATCH, DELETE, POST');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра.' });
  }
};
