const { getSql, ensureSchema } = require('../lib/db');
const { isAdmin } = require('../lib/auth');


function clean(b) {
  b = b || {};
  const title = String(b.title ?? '').trim();
  const city = String(b.city ?? '').trim();
  const details = String(b.details ?? '').trim();
  const image_url = String(b.image_url ?? '').trim();
  const price = Number(b.price);
  const published = b.published === undefined ? true : !!b.published;

  if (!title || title.length > 120) return { error: 'Заглавието е задължително (до 120 символа).' };
  if (!city || city.length > 60) return { error: 'Градът е задължителен (до 60 символа).' };
  if (details.length > 200) return { error: 'Описанието е до 200 символа.' };
  if (!Number.isInteger(price) || price < 0 || price > 1e9) return { error: 'Цената трябва да е цяло число ≥ 0.' };
  if (image_url && !/^https?:\/\/\S+$/i.test(image_url)) return { error: 'Снимката трябва да е http(s) адрес.' };
  if (image_url.length > 500) return { error: 'Адресът на снимката е твърде дълъг.' };
  return { value: { title, city, details, price, image_url, published } };
}

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const sql = getSql();
    const admin = isAdmin(req);

    if (req.method === 'GET') {
      if (admin && req.query.all === '1') {
        res.setHeader('Cache-Control', 'no-store');
        const rows = await sql`SELECT id, title, city, details, price, image_url, published, created_at FROM properties ORDER BY id DESC`;
        return res.status(200).json(rows);
      }
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
      const rows = await sql`SELECT id, title, city, details, price, image_url FROM properties WHERE published ORDER BY id DESC`;
      return res.status(200).json(rows);
    }

    if (!admin) return res.status(401).json({ error: 'Нужен е вход в админ панела.' });
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'POST') {
      const { value: v, error } = clean(req.body);
      if (error) return res.status(400).json({ error });
      const [row] = await sql`
        INSERT INTO properties (title, city, details, price, image_url, published)
        VALUES (${v.title}, ${v.city}, ${v.details}, ${v.price}, ${v.image_url}, ${v.published})
        RETURNING id, title, city, details, price, image_url, published, created_at`;
      return res.status(201).json(row);
    }

    if (req.method === 'PUT') {
      const id = Number(req.body && req.body.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      const { value: v, error } = clean(req.body);
      if (error) return res.status(400).json({ error });
      const [row] = await sql`
        UPDATE properties SET title=${v.title}, city=${v.city}, details=${v.details},
          price=${v.price}, image_url=${v.image_url}, published=${v.published}
        WHERE id=${id}
        RETURNING id, title, city, details, price, image_url, published, created_at`;
      if (!row) return res.status(404).json({ error: 'Имотът не е намерен.' });
      return res.status(200).json(row);
    }

    if (req.method === 'DELETE') {
      const id = Number(req.query.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      await sql`DELETE FROM properties WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра: ' + e.message });
  }
};
