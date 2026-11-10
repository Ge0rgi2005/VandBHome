const { getSql, ensureSchema } = require('../lib/db');
const auth = require('../lib/auth');
const { EMAIL_RE, delay } = require('../lib/http');

// GET  /api/account            -> { user, favorites:[id…] }
// POST /api/account {action}   -> register | login | logout | delete
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    if (!auth.configured()) return res.status(500).json({ error: 'Сървърът не е настроен (липсва ADMIN_PASSWORD във Vercel).' });
    await ensureSchema();
    const sql = getSql();

    if (req.method === 'GET') {
      const uid = auth.userId(req);
      if (!uid) return res.status(200).json({ user: null, favorites: [] });
      const [u] = await sql`SELECT id, email, name, created_at FROM users WHERE id = ${uid}`;
      if (!u) { auth.userLogout(res); return res.status(200).json({ user: null, favorites: [] }); }
      const fav = await sql`SELECT property_id FROM favorites WHERE user_id = ${uid}`;
      return res.status(200).json({ user: u, favorites: fav.map((f) => f.property_id) });
    }

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'GET, POST');
      return res.status(405).json({ error: 'Методът не е позволен.' });
    }

    const b = req.body || {};
    const action = b.action;

    if (action === 'logout') { auth.userLogout(res); return res.status(200).json({ ok: true }); }

    if (action === 'register') {
      const email = String(b.email || '').trim().toLowerCase().slice(0, 120);
      const password = String(b.password || '');
      const name = String(b.name || '').trim().slice(0, 80);
      if (!EMAIL_RE.test(email)) return res.status(400).json({ error: 'Невалиден имейл адрес.' });
      if (password.length < 8 || !/\d/.test(password) || password.length > 200) return res.status(400).json({ error: 'Паролата трябва да е поне 8 символа и да съдържа цифра.' });
      if (b.consent !== true) return res.status(400).json({ error: 'Необходимо е съгласие с правилата за лични данни.' });
      const hash = await auth.hashPassword(password);
      const rows = await sql`INSERT INTO users (email, name, password_hash) VALUES (${email}, ${name}, ${hash}) ON CONFLICT (email) DO NOTHING RETURNING id, email, name`;
      if (!rows.length) return res.status(409).json({ error: 'Вече има профил с този имейл. Влез в него.' });
      auth.userLogin(res, rows[0].id);
      return res.status(201).json({ user: rows[0], favorites: [] });
    }

    if (action === 'login') {
      const email = String(b.email || '').trim().toLowerCase();
      const password = String(b.password || '');
      const [u] = await sql`SELECT id, email, name, password_hash FROM users WHERE email = ${email}`;
      const ok = u && (await auth.verifyPassword(password, u.password_hash));
      if (!ok) { await delay(600); return res.status(401).json({ error: 'Грешен имейл или парола.' }); }
      auth.userLogin(res, u.id);
      const fav = await sql`SELECT property_id FROM favorites WHERE user_id = ${u.id}`;
      return res.status(200).json({ user: { id: u.id, email: u.email, name: u.name }, favorites: fav.map((f) => f.property_id) });
    }

    if (action === 'delete') {
      const uid = auth.userId(req);
      if (!uid) return res.status(401).json({ error: 'Не си влязъл в профила си.' });
      await sql`DELETE FROM users WHERE id = ${uid}`;
      auth.userLogout(res);
      return res.status(200).json({ ok: true });
    }

    return res.status(400).json({ error: 'Непознато действие.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра. Опитай отново.' });
  }
};
