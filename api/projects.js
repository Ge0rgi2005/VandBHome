const { getSql, ensureSchema } = require('../lib/db');
const { isAdmin } = require('../lib/auth');

const URL_RE = /^https?:\/\/\S+$/i;
const FIELDS = 'id, name, city, district, tagline, description, stage, image_url, published, created_at';

function clean(b) {
  b = b || {};
  const s = (k, max) => String(b[k] ?? '').trim().slice(0, max + 1);
  const v = { name: s('name', 100), city: s('city', 60), district: s('district', 80), tagline: s('tagline', 160),
    description: s('description', 4000), stage: s('stage', 60), image_url: s('image_url', 500), published: b.published === undefined ? true : !!b.published };
  if (!v.name || v.name.length > 100) return { error: 'Името на проекта е задължително (до 100 символа).' };
  if (!v.city || v.city.length > 60) return { error: 'Градът е задължителен.' };
  if (v.district.length > 80 || v.tagline.length > 160 || v.stage.length > 60) return { error: 'Някое от полетата е твърде дълго.' };
  if (v.description.length > 4000) return { error: 'Описанието е до 4000 символа.' };
  if (v.image_url && !URL_RE.test(v.image_url)) return { error: 'Снимката трябва да е http(s) адрес.' };
  return { value: v };
}

// Публично: GET /api/projects (списък със свободни жилища и диапазон на цените) · GET ?id=
// Админ: GET ?all=1 · POST · PUT · DELETE ?id=
module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const sql = getSql();
    const admin = isAdmin(req);
    const q = req.query || {};

    if (req.method === 'GET') {
      if (admin && q.all === '1') {
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).json(await sql.query(`SELECT ${FIELDS} FROM projects ORDER BY id DESC`));
      }
      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');
      const stats = `(SELECT count(*)::int FROM properties p WHERE p.project_id = pr.id AND p.published) AS free,
                     (SELECT min(price) FROM properties p WHERE p.project_id = pr.id AND p.published) AS min_price,
                     (SELECT max(price) FROM properties p WHERE p.project_id = pr.id AND p.published) AS max_price`;
      if (q.id) {
        const id = Number(q.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
        const rows = await sql.query(`SELECT pr.id, pr.name, pr.city, pr.district, pr.tagline, pr.description, pr.stage, pr.image_url, ${stats} FROM projects pr WHERE pr.id = $1 AND (pr.published OR $2)`, [id, admin]);
        return rows.length ? res.status(200).json(rows[0]) : res.status(404).json({ error: 'Проектът не е намерен.' });
      }
      return res.status(200).json(await sql.query(`SELECT pr.id, pr.name, pr.city, pr.district, pr.tagline, pr.stage, pr.image_url, ${stats} FROM projects pr WHERE pr.published ORDER BY pr.id DESC`));
    }

    if (!admin) return res.status(401).json({ error: 'Нужен е вход в админ панела.' });
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'POST' || req.method === 'PUT') {
      const { value: v, error } = clean(req.body);
      if (error) return res.status(400).json({ error });
      if (req.method === 'POST') {
        const [row] = await sql.query(`INSERT INTO projects (name, city, district, tagline, description, stage, image_url, published) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${FIELDS}`,
          [v.name, v.city, v.district, v.tagline, v.description, v.stage, v.image_url, v.published]);
        return res.status(201).json(row);
      }
      const id = Number(req.body && req.body.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      const [row] = await sql.query(`UPDATE projects SET name=$1, city=$2, district=$3, tagline=$4, description=$5, stage=$6, image_url=$7, published=$8 WHERE id=$9 RETURNING ${FIELDS}`,
        [v.name, v.city, v.district, v.tagline, v.description, v.stage, v.image_url, v.published, id]);
      return row ? res.status(200).json(row) : res.status(404).json({ error: 'Проектът не е намерен.' });
    }

    if (req.method === 'DELETE') {
      const id = Number(q.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      await sql`UPDATE properties SET project_id = NULL WHERE project_id = ${id}`;
      await sql`DELETE FROM projects WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра.' });
  }
};
