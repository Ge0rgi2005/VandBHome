// Общи помощни функции за API
const codeOf = (id) => 'VB-' + (1000 + Number(id));
const idFromCode = (s) => {
  const m = String(s || '').trim().match(/^(?:vb-?)?(\d{4,})$/i);
  return m ? Number(m[1]) - 1000 : null;
};
const delay = (ms) => new Promise((r) => setTimeout(r, ms));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function publicProp(r, full) {
  const out = {
    id: r.id, code: codeOf(r.id), title: r.title, deal: r.deal, type: r.type, city: r.city,
    district: r.district, details: r.details, price: r.price, area: r.area, floor: r.floor,
    bedrooms: r.bedrooms, construction: r.construction, furnished: r.furnished,
    new_construction: r.new_construction, image_url: r.image_url, created_at: r.created_at,
    ppsqm: r.area > 0 ? Math.round(r.price / r.area) : null,
  };
  if (full) {
    out.description = r.description;
    out.images = String(r.images || '').split('\n').map((s) => s.trim()).filter(Boolean);
  }
  return out;
}

module.exports = { codeOf, idFromCode, delay, EMAIL_RE, publicProp };
