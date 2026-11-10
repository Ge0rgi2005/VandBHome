const { getSql, ensureSchema } = require('../lib/db');
const { isAdmin } = require('../lib/auth');

const URL_RE = /^https?:\/\/\S+$/i;
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const FIELDS = 'id, slug, title, excerpt, body, cover_url, published, created_at';

const TR = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sht',ъ:'a',ь:'y',ю:'yu',я:'ya' };
const slugify = (t) => String(t).toLowerCase().split('').map((c) => (TR[c] !== undefined ? TR[c] : c)).join('')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

function clean(b) {
  b = b || {};
  const s = (k, max) => String(b[k] ?? '').trim().slice(0, max + 1);
  const v = { title: s('title', 140), excerpt: s('excerpt', 300), body: s('body', 20000), cover_url: s('cover_url', 500), slug: s('slug', 80).toLowerCase(), published: b.published === undefined ? true : !!b.published };
  if (!v.title || v.title.length > 140) return { error: 'Заглавието е задължително (до 140 символа).' };
  if (v.excerpt.length > 300) return { error: 'Уводът е до 300 символа.' };
  if (v.body.length > 20000) return { error: 'Текстът е твърде дълъг.' };
  if (v.cover_url && !URL_RE.test(v.cover_url)) return { error: 'Корицата трябва да е http(s) адрес.' };
  if (!v.slug) v.slug = slugify(v.title);
  if (!SLUG_RE.test(v.slug)) return { error: 'Адресът (slug) може да съдържа само малки латински букви, цифри и тирета.' };
  return { value: v };
}

// Публично: GET /api/posts · GET ?slug=  |  Админ: GET ?all=1 · POST · PUT · DELETE ?id=
module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const sql = getSql();
    const admin = isAdmin(req);
    const q = req.query || {};

    if (req.method === 'GET') {
      if (admin && q.all === '1') {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(await sql.query(`SELECT ${FIELDS} FROM posts ORDER BY id DESC`));
      }
      res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
      if (q.slug) {
        const rows = await sql.query(`SELECT ${FIELDS} FROM posts WHERE slug = $1 AND (published OR $2)`, [String(q.slug), admin]);
        return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Статията не е намерена.' });
      }
      return res.status(200).json(await sql`SELECT id, slug, title, excerpt, cover_url, created_at FROM posts WHERE published ORDER BY created_at DESC, id DESC LIMIT 100`);
    }

    if (!admin) return res.status(401).json({ error: 'Нужен е вход в админ панела.' });
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'POST' || req.method === 'PUT') {
      const { value: v, error } = clean(req.body);
      if (error) return res.status(400).json({ error });
      try {
        if (req.method === 'POST') {
          const [row] = await sql.query(`INSERT INTO posts (slug, title, excerpt, body, cover_url, published) VALUES ($1,$2,$3,$4,$5,$6) RETURNING ${FIELDS}`,
            [v.slug, v.title, v.excerpt, v.body, v.cover_url, v.published]);
          return res.status(201).json(row);
        }
        const id = Number(req.body && req.body.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
        const [row] = await sql.query(`UPDATE posts SET slug=$1, title=$2, excerpt=$3, body=$4, cover_url=$5, published=$6 WHERE id=$7 RETURNING ${FIELDS}`,
          [v.slug, v.title, v.excerpt, v.body, v.cover_url, v.published, id]);
        return row ? res.status(200).json(row) : res.status(404).json({ error: 'Статията не е намерена.' });
      } catch (e) {
        if (String(e.message).includes('posts_slug_key') || e.code === '23505') return res.status(409).json({ error: 'Вече има статия с този адрес (slug).' });
        throw e;
      }
    }

    if (req.method === 'DELETE') {
      const id = Number(q.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      await sql`DELETE FROM posts WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра.' });
  }
};
