const { getSql, ensureSchema } = require('../lib/db');
const { isAdmin } = require('../lib/auth');
const { idFromCode, publicProp } = require('../lib/http');

const FIELDS = 'id, title, deal, type, city, district, details, description, price, area, floor, bedrooms, construction, furnished, new_construction, project_id, image_url, images, published, created_at';
const SORTS = {
  new: 'id DESC',
  price_asc: 'price ASC, id DESC',
  price_desc: 'price DESC, id DESC',
  sqm: '(price::float / NULLIF(area, 0)) ASC NULLS LAST, id DESC',
};
const URL_RE = /^https?:\/\/\S+$/i;

function clean(b) {
  b = b || {};
  const s = (k, max) => String(b[k] ?? '').trim().slice(0, max + 1);
  const v = {
    title: s('title', 120), city: s('city', 60), district: s('district', 80), type: s('type', 40),
    details: s('details', 200), description: String(b.description ?? '').trim().slice(0, 4001),
    floor: s('floor', 20), construction: s('construction', 40), image_url: s('image_url', 500),
    images: String(b.images ?? '').trim().slice(0, 4001),
    deal: b.deal === 'rent' ? 'rent' : 'sale',
    price: Number(b.price), area: Number(b.area || 0), bedrooms: Number(b.bedrooms || 0),
    furnished: !!b.furnished, new_construction: !!b.new_construction,
    published: b.published === undefined ? true : !!b.published,
    project_id: b.project_id === null || b.project_id === undefined || b.project_id === '' ? null : Number(b.project_id),
  };
  if (!v.title || v.title.length > 120) return { error: 'Заглавието е задължително (до 120 символа).' };
  if (!v.city || v.city.length > 60) return { error: 'Градът е задължителен (до 60 символа).' };
  if (!v.type || v.type.length > 40) return { error: 'Типът е задължителен.' };
  if (v.project_id !== null && !Number.isInteger(v.project_id)) return { error: 'Невалиден проект.' };
  if (v.district.length > 80) return { error: 'Кварталът е до 80 символа.' };
  if (v.details.length > 200) return { error: 'Краткото описание е до 200 символа.' };
  if (v.description.length > 4000) return { error: 'Подробното описание е до 4000 символа.' };
  if (!Number.isInteger(v.price) || v.price < 0 || v.price > 1e9) return { error: 'Цената трябва да е цяло число ≥ 0.' };
  if (!Number.isInteger(v.area) || v.area < 0 || v.area > 1e6) return { error: 'Площта трябва да е цяло число ≥ 0.' };
  if (!Number.isInteger(v.bedrooms) || v.bedrooms < 0 || v.bedrooms > 50) return { error: 'Спални: число от 0 до 50.' };
  if (v.image_url && !URL_RE.test(v.image_url)) return { error: 'Основната снимка трябва да е http(s) адрес.' };
  const extra = v.images ? v.images.split('\n').map((x) => x.trim()).filter(Boolean) : [];
  if (extra.length > 12 || extra.some((u) => !URL_RE.test(u) || u.length > 500)) return { error: 'Допълнителни снимки: до 12 http(s) адреса, по един на ред.' };
  v.images = extra.join('\n');
  return { value: v };
}

// Динамичен филтър за публичното търсене
function buildFilter(q) {
  const where = ['published'];
  const p = [];
  const add = (sqlText, val) => { p.push(val); where.push(sqlText.replace('?', '$' + p.length)); };

  if (q.deal === 'rent' || q.deal === 'sale') add('deal = ?', q.deal);
  if (q.city) add('city = ?', String(q.city));
  if (q.type) add('type = ?', String(q.type));
  if (q.newc === '1') where.push('new_construction');
  if (q.project && Number.isInteger(Number(q.project))) add('project_id = ?', Number(q.project));
  const num = (k) => (q[k] !== undefined && q[k] !== '' && Number.isFinite(Number(q[k])) ? Math.floor(Number(q[k])) : null);
  if (num('minPrice') !== null) add('price >= ?', num('minPrice'));
  if (num('maxPrice') !== null) add('price <= ?', num('maxPrice'));
  if (num('minArea') !== null) add('area >= ?', num('minArea'));
  if (num('maxArea') !== null) add('area <= ?', num('maxArea'));
  if (q.code) {
    const id = idFromCode(q.code);
    add('id = ?', id === null ? -1 : id);
  }
  if (q.ids) {
    const ids = String(q.ids).split(',').map(Number).filter(Number.isInteger).slice(0, 100);
    add('id = ANY(?::int[])', ids);
  }
  return { where: where.join(' AND '), params: p };
}

module.exports = async (req, res) => {
  try {
    await ensureSchema();
    const sql = getSql();
    const admin = isAdmin(req);
    const q = req.query || {};

    if (req.method === 'GET') {
      // Всички записи за админ панела
      if (admin && q.all === '1') {
        res.setHeader('Cache-Control', 'no-store');
        const rows = await sql.query(`SELECT ${FIELDS} FROM properties ORDER BY id DESC`);
        return res.status(200).json(rows);
      }

      res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=60');

      // Един имот
      if (q.id) {
        const id = Number(q.id);
        if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
        const rows = await sql.query(`SELECT ${FIELDS} FROM properties WHERE id = $1 AND (published OR $2)`, [id, admin]);
        if (!rows.length) return res.status(404).json({ error: 'Имотът не е намерен.' });
        return res.status(200).json(publicProp(rows[0], true));
      }

      // Налични градове и типове за филтрите
      if (q.facets === '1') {
        const [cities, types] = await Promise.all([
          sql`SELECT city AS name, count(*)::int AS count FROM properties WHERE published GROUP BY city ORDER BY count(*) DESC, city`,
          sql`SELECT type AS name, count(*)::int AS count FROM properties WHERE published AND type <> '' GROUP BY type ORDER BY count(*) DESC, type`,
        ]);
        return res.status(200).json({ cities, types });
      }

      // Списък с филтри, сортиране и страници
      const { where, params } = buildFilter(q);
      const pageSize = Math.min(Math.max(parseInt(q.pageSize, 10) || 12, 1), 48);
      const page = Math.max(parseInt(q.page, 10) || 1, 1);
      const order = SORTS[q.sort] || SORTS.new;
      const [{ count }] = await sql.query(`SELECT count(*)::int AS count FROM properties WHERE ${where}`, params);
      const rows = await sql.query(
        `SELECT ${FIELDS} FROM properties WHERE ${where} ORDER BY ${order} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`, params);
      return res.status(200).json({
        items: rows.map((r) => publicProp(r, false)),
        total: count, page, pages: Math.max(Math.ceil(count / pageSize), 1),
      });
    }

    if (!admin) return res.status(401).json({ error: 'Нужен е вход в админ панела.' });
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'POST' || req.method === 'PUT') {
      const { value: v, error } = clean(req.body);
      if (error) return res.status(400).json({ error });
      if (req.method === 'POST') {
        const [row] = await sql.query(
          `INSERT INTO properties (title, deal, type, city, district, details, description, price, area, floor, bedrooms, construction, furnished, new_construction, image_url, images, published, project_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING ${FIELDS}`,
          [v.title, v.deal, v.type, v.city, v.district, v.details, v.description, v.price, v.area, v.floor, v.bedrooms, v.construction, v.furnished, v.new_construction, v.image_url, v.images, v.published, v.project_id]);
        return res.status(201).json(row);
      }
      const id = Number(req.body && req.body.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      const [row] = await sql.query(
        `UPDATE properties SET title=$1, deal=$2, type=$3, city=$4, district=$5, details=$6, description=$7, price=$8, area=$9, floor=$10,
           bedrooms=$11, construction=$12, furnished=$13, new_construction=$14, image_url=$15, images=$16, published=$17, project_id=$18
         WHERE id=$19 RETURNING ${FIELDS}`,
        [v.title, v.deal, v.type, v.city, v.district, v.details, v.description, v.price, v.area, v.floor, v.bedrooms, v.construction, v.furnished, v.new_construction, v.image_url, v.images, v.published, v.project_id, id]);
      if (!row) return res.status(404).json({ error: 'Имотът не е намерен.' });
      return res.status(200).json(row);
    }

    if (req.method === 'DELETE') {
      const id = Number(q.id);
      if (!Number.isInteger(id)) return res.status(400).json({ error: 'Невалидно ID.' });
      await sql`DELETE FROM properties WHERE id=${id}`;
      return res.status(200).json({ ok: true });
    }

    res.setHeader('Allow', 'GET, POST, PUT, DELETE');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра.' });
  }
};
