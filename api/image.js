const { getSql, ensureSchema } = require('../lib/db');
const { isAdmin } = require('../lib/auth');

const MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 2.5 * 1024 * 1024;

// GET /api/image?id=N -> снимката (кеширана); POST (админ) {data:"data:image/jpeg;base64,…"} -> { url }
module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const sql = getSql();

    if (req.method === 'GET') {
      const id = Number(req.query && req.query.id);
      if (!Number.isInteger(id)) { res.statusCode = 400; return res.end('bad id'); }
      const rows = await sql`SELECT mime, data FROM images WHERE id = ${id}`;
      if (!rows.length) { res.statusCode = 404; return res.end('not found'); }
      res.setHeader('Content-Type', rows[0].mime);
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.statusCode = 200;
      return res.end(Buffer.from(rows[0].data, 'base64'));
    }

    if (req.method === 'POST') {
      if (!isAdmin(req)) return res.status(401).json({ error: 'Нужен е вход в админ панела.' });
      const m = String((req.body && req.body.data) || '').match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!m || !MIMES.includes(m[1])) return res.status(400).json({ error: 'Позволени са JPEG, PNG и WebP снимки.' });
      if (Buffer.byteLength(m[2], 'base64') > MAX_BYTES) return res.status(413).json({ error: 'Снимката е твърде голяма (макс. 2,5 МБ).' });
      const [row] = await sql`INSERT INTO images (mime, data) VALUES (${m[1]}, ${m[2]}) RETURNING id`;
      res.setHeader('Cache-Control', 'no-store');
      return res.status(201).json({ url: '/api/image?id=' + row.id });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра.' });
  }
};
