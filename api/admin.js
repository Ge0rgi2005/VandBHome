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
                 l.property_id, l.note, l.user_id, p.title AS property_title
          FROM leads l LEFT JOIN properties p ON p.id = l.property_id
          ORDER BY l.id DESC LIMIT 500`);
      }
      if (q.what === 'contacts') {
        // Всички контакти: групирани по телефон, свързани с профил по имейл/потребител
        return res.status(200).json(await sql`
          SELECT l.phone, max(l.name) AS name, max(NULLIF(l.email, '')) AS email, count(*)::int AS requests,
                 min(l.created_at) AS first_at, max(l.created_at) AS last_at,
                 bool_or(l.status = 'new') AS has_new,
                 (SELECT u.id FROM users u WHERE u.id = max(l.user_id) OR lower(u.email) = lower(max(NULLIF(l.email, ''))) LIMIT 1) AS user_id
          FROM leads l GROUP BY l.phone ORDER BY max(l.created_at) DESC LIMIT 1000`);
      }
      if (q.what === 'profile') {
        // Пълен профил: по потребител (uid) и/или по телефон
        const uid = q.uid ? Number(q.uid) : null;
        const phone = q.phone ? String(q.phone) : null;
        if ((uid !== null && !Number.isInteger(uid)) || (uid === null && !phone)) return res.status(400).json({ error: 'Невалидна заявка.' });
        const [user] = uid ? await sql`SELECT id, email, name, created_at FROM users WHERE id = ${uid}` : [null];
        const email = user ? user.email : (phone ? ((await sql`SELECT max(NULLIF(email, '')) AS e FROM leads WHERE phone = ${phone}`)[0] || {}).e : null);
        const linked = !user && email ? (await sql`SELECT id, email, name, created_at FROM users WHERE lower(email) = lower(${email})`)[0] : null;
        const u = user || linked || null;
        const leads = await sql`
          SELECT l.id, l.kind, l.name, l.phone, l.email, l.type, l.city, l.message, l.status, l.note, l.created_at, l.property_id, p.title AS property_title
          FROM leads l LEFT JOIN properties p ON p.id = l.property_id
          WHERE (${phone}::text IS NOT NULL AND l.phone = ${phone}) OR (${u ? u.id : null}::int IS NOT NULL AND l.user_id = ${u ? u.id : null}::int)
          ORDER BY l.id DESC`;
        const favorites = u ? await sql`
          SELECT p.id, p.title, p.city, p.price, f.price_saved, f.created_at AS saved_at
          FROM favorites f JOIN properties p ON p.id = f.property_id WHERE f.user_id = ${u.id} ORDER BY f.created_at DESC` : [];
        return res.status(200).json({ user: u, leads, favorites });
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
               (SELECT count(*)::int FROM users) AS users,
               (SELECT count(*)::int FROM projects) AS projects,
               (SELECT count(*)::int FROM posts) AS posts`;
      return res.status(200).json(s);
    }

    if (req.method === 'PATCH') {
      const id = Number(req.body && req.body.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      if (req.body && typeof req.body.note === 'string') {
        const note = req.body.note.slice(0, 2000);
        await sql`UPDATE leads SET note = ${note} WHERE id = ${id}`;
        return res.status(200).json({ ok: true, note });
      }
      const status = req.body && req.body.status === 'done' ? 'done' : 'new';
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
