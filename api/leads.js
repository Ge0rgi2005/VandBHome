const { getSql, ensureSchema } = require('../lib/db');
const { userId } = require('../lib/auth');
const { EMAIL_RE } = require('../lib/http');

const KINDS = ['offer', 'listing', 'contact', 'property', 'mortgage', 'career'];
const PHONE_RE = /^[+0-9()\s-]{6,20}$/;

// POST /api/leads – запитвания от формите в сайта
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Методът не е позволен.' });
  }
  try {
    const b = req.body || {};
    if (b.website) return res.status(200).json({ ok: true }); // капан за ботове (скрито поле)

    const s = (k, max) => String(b[k] ?? '').trim().slice(0, max);
    const kind = s('kind', 20);
    const name = s('name', 80), phone = s('phone', 20), email = s('email', 120);
    const type = s('type', 60), city = s('city', 60), message = s('message', 1000);
    const pid = b.property_id === undefined || b.property_id === null || b.property_id === '' ? null : Number(b.property_id);

    if (!KINDS.includes(kind)) return res.status(400).json({ error: 'Невалиден вид запитване.' });
    if (name.length < 2) return res.status(400).json({ error: 'Моля, въведи име.' });
    if (!PHONE_RE.test(phone)) return res.status(400).json({ error: 'Моля, въведи валиден телефон.' });
    if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Невалиден имейл адрес.' });
    if (b.consent !== true) return res.status(400).json({ error: 'Необходимо е съгласие с правилата за лични данни.' });
    if (pid !== null && !Number.isInteger(pid)) return res.status(400).json({ error: 'Невалиден имот.' });

    await ensureSchema();
    const sql = getSql();

    const [{ n }] = await sql`SELECT count(*)::int AS n FROM leads WHERE phone = ${phone} AND created_at > now() - interval '1 minute'`;
    if (n >= 3) return res.status(429).json({ error: 'Твърде много опити. Опитай след малко.' });

    const uid = userId(req);
    const exists = pid === null ? [] : await sql`SELECT 1 FROM properties WHERE id = ${pid}`;
    await sql`
      INSERT INTO leads (kind, name, phone, email, type, city, message, property_id, user_id)
      VALUES (${kind}, ${name}, ${phone}, ${email}, ${type}, ${city}, ${message}, ${exists.length ? pid : null}, ${uid})`;
    return res.status(201).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Грешка в сървъра. Опитай отново.' });
  }
};
