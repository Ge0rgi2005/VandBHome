const { getSql, ensureSchema } = require('../lib/db');
const { userId } = require('../lib/auth');
const { publicProp } = require('../lib/http');

// GET  /api/favorites              -> любими имоти (със записаната цена)
// POST /api/favorites {property_id} -> добавя/премахва от любими
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  try {
    const uid = userId(req);
    if (!uid) return res.status(401).json({ error: 'Влез в профила си, за да запазваш имоти.' });
    await ensureSchema();
    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql`
        SELECT p.id, p.title, p.deal, p.type, p.city, p.district, p.details, p.description, p.price, p.area, p.floor,
               p.bedrooms, p.construction, p.furnished, p.new_construction, p.image_url, p.images, p.created_at,
               f.price_saved, f.created_at AS saved_at
        FROM favorites f JOIN properties p ON p.id = f.property_id
        WHERE f.user_id = ${uid} AND p.published
        ORDER BY f.created_at DESC`;
      return res.status(200).json(rows.map((r) => ({ ...publicProp(r, false), price_saved: r.price_saved, saved_at: r.saved_at })));
    }

    if (req.method === 'POST') {
      const pid = Number(req.body && req.body.property_id);
      if (!Number.isInteger(pid)) return res.status(400).json({ error: 'Невалиден имот.' });
      const del = await sql`DELETE FROM favorites WHERE user_id = ${uid} AND property_id = ${pid} RETURNING property_id`;
      if (del.length) return res.status(200).json({ favorite: false });
      const ins = await sql`
        INSERT INTO favorites (user_id, property_id, price_saved)
        SELECT ${uid}, id, price FROM properties WHERE id = ${pid} AND published
        RETURNING property_id`;
      if (!ins.length) return res.status(404).json({ error: 'Имотът не е намерен.' });
      return res.status(200).json({ favorite: true });
    }

    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра.' });
  }
};
