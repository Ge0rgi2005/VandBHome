const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const loginView = $('#login-view'), dashView = $('#dash-view'), logoutBtn = $('#logout');
const flashEl = $('#flash');
const dlg = $('#dlg'), pform = $('#prop-form'), formMsg = $('#form-msg');
let items = [], leads = [], users = [], projects = [], posts = [], tab = 'props';

const fmt = (n) => Number(n).toLocaleString('bg-BG');
const fdate = (s) => new Date(s).toLocaleDateString('bg-BG');
const fdt = (s) => new Date(s).toLocaleString('bg-BG', { dateStyle: 'short', timeStyle: 'short' });
const code = (id) => 'VB-' + (1000 + id);
const KINDS = { offer: 'Оферта', listing: 'Обява', contact: 'Контакт', property: 'Запитване за имот', mortgage: 'Ипотека', career: 'Кандидатура', scholarship: 'Стипендия', project: 'Проект' };

async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) { const err = new Error((data && data.error) || 'Грешка ' + res.status); err.status = res.status; throw err; }
  return data;
}
function flash(text, isErr) {
  flashEl.textContent = text; flashEl.className = 'flash' + (isErr ? ' err' : ''); flashEl.hidden = false;
  clearTimeout(flash.t); flash.t = setTimeout(() => (flashEl.hidden = true), 4000);
}
const showLogin = () => { loginView.hidden = false; dashView.hidden = true; logoutBtn.hidden = true; };
const showDash = () => { loginView.hidden = true; dashView.hidden = false; logoutBtn.hidden = false; };
const onErr = (e) => (e.status === 401 ? showLogin() : flash(e.message, true));

function cell(tr, text, cls) { const td = document.createElement('td'); if (cls) td.className = cls; td.textContent = text; tr.appendChild(td); return td; }
function badge(text, cls) { const b = document.createElement('span'); b.className = 'badge ' + cls; b.textContent = text; return b; }
function actions(tr, list) {
  const td = document.createElement('td'); td.className = 'act';
  list.forEach(([label, cls, fn]) => { const b = document.createElement('button'); b.className = 'ibtn ' + cls; b.textContent = label; b.onclick = fn; td.appendChild(b); });
  tr.appendChild(td);
}
function emptyRow(body, cols, text) {
  const tr = document.createElement('tr'); const td = cell(tr, text, 'empty'); td.colSpan = cols; body.appendChild(tr);
}

// ---------- Статистика ----------
async function loadStats() {
  const s = await api('/api/admin');
  $('#stats').innerHTML = '';
  [[s.properties, 'имота общо'], [s.published, 'публикувани'], [s.new_leads, 'нови запитвания'], [s.leads, 'запитвания общо'], [s.users, 'потребители'], [s.projects, 'проекта'], [s.posts, 'статии']].forEach(([n, l]) => {
    const d = document.createElement('div'); d.className = 'stat';
    d.innerHTML = '<b></b><span></span>'; d.firstChild.textContent = n; d.lastChild.textContent = l; $('#stats').appendChild(d);
  });
  const pill = $('#pill-leads'); pill.hidden = !s.new_leads; pill.textContent = s.new_leads;
}

// ---------- Имоти ----------
function renderProps() {
  const q = $('#q').value.trim().toLowerCase();
  const list = items.filter((p) => !q || (p.title + ' ' + p.city + ' ' + p.district + ' ' + p.type + ' ' + code(p.id)).toLowerCase().includes(q));
  $('#count').textContent = `${items.length} общо · ${items.filter((p) => p.published).length} публикувани`;
  const body = $('#rows'); body.textContent = '';
  if (!list.length) return emptyRow(body, 10, items.length ? 'Няма резултати.' : 'Още няма имоти. Натисни „Добави имот“ или „Примерни данни“.');
  for (const p of list) {
    const tr = document.createElement('tr');
    cell(tr, code(p.id), 'id');
    const tdI = document.createElement('td');
    if (p.image_url) { const img = document.createElement('img'); img.className = 'thumb'; img.alt = ''; img.loading = 'lazy'; img.src = p.image_url; tdI.appendChild(img); }
    else { const ph = document.createElement('div'); ph.className = 'thumb'; tdI.appendChild(ph); }
    tr.appendChild(tdI);
    cell(tr, p.title, 't');
    const tdD = document.createElement('td'); tdD.appendChild(badge(p.deal === 'rent' ? 'Наем' : 'Продажба', p.deal === 'rent' ? 'rent' : 'sale'));
    if (p.new_construction) { tdD.appendChild(document.createTextNode(' ')); tdD.appendChild(badge('Ново', 'new')); }
    tr.appendChild(tdD);
    cell(tr, p.type || '—');
    cell(tr, [p.city, p.district].filter(Boolean).join(' / '));
    cell(tr, p.area ? fmt(p.area) + ' м²' : '—', 'num');
    cell(tr, fmt(p.price) + ' €' + (p.deal === 'rent' ? '/мес.' : ''), 'num');
    const tdS = document.createElement('td'); tdS.appendChild(badge(p.published ? 'Публикуван' : 'Скрит', p.published ? 'on' : 'off')); tr.appendChild(tdS);
    actions(tr, [[p.published ? 'Скрий' : 'Покажи', '', () => togglePub(p)], ['Редактирай', '', () => openForm(p)], ['Изтрий', 'del', () => removeProp(p)]]);
    body.appendChild(tr);
  }
  const cities = [...new Set(items.map((p) => p.city))].sort();
  $('#cities').innerHTML = ''; cities.forEach((c) => { const o = document.createElement('option'); o.value = c; $('#cities').appendChild(o); });
}
function fillProjectSelect() {
  const sel = pform.elements.project_id; const cur = sel.value;
  sel.innerHTML = '<option value="">— без проект —</option>';
  projects.forEach((p) => { const o = document.createElement('option'); o.value = p.id; o.textContent = `${p.name} (${p.city})`; sel.appendChild(o); });
  sel.value = cur;
}
async function loadProps() {
  [items, projects] = await Promise.all([api('/api/properties?all=1'), api('/api/projects?all=1')]);
  fillProjectSelect(); renderProps();
}

function openForm(p) {
  pform.reset(); formMsg.hidden = true;
  $('#dlg-title').textContent = p ? 'Редакция на имот ' + code(p.id) : 'Нов имот';
  const f = pform.elements;
  f.id.value = p ? p.id : '';
  if (p) {
    ['title', 'deal', 'type', 'city', 'district', 'price', 'area', 'floor', 'bedrooms', 'construction', 'details', 'description', 'image_url', 'images'].forEach((k) => { f[k].value = p[k] ?? ''; });
    f.project_id.value = p.project_id == null ? '' : String(p.project_id);
    f.furnished.checked = !!p.furnished; f.new_construction.checked = !!p.new_construction; f.published.checked = !!p.published;
  } else { f.published.checked = true; }
  dlg.showModal(); f.title.focus();
}
const payloadOf = (p, over = {}) => ({
  title: p.title, deal: p.deal, type: p.type, city: p.city, district: p.district, price: p.price, area: p.area, floor: p.floor,
  bedrooms: p.bedrooms, construction: p.construction, details: p.details, description: p.description, image_url: p.image_url,
  images: p.images, project_id: p.project_id, furnished: p.furnished, new_construction: p.new_construction, published: p.published, ...over,
});
async function saveProp(payload, id) {
  const saved = await api('/api/properties', { method: id ? 'PUT' : 'POST', body: id ? { ...payload, id } : payload });
  const i = items.findIndex((x) => x.id === saved.id);
  if (i >= 0) items[i] = saved; else items.unshift(saved);
  renderProps(); loadStats().catch(() => {});
}
pform.onsubmit = async (e) => {
  e.preventDefault(); formMsg.hidden = true;
  const f = pform.elements;
  const payload = {
    title: f.title.value.trim(), deal: f.deal.value, type: f.type.value.trim(), city: f.city.value.trim(), district: f.district.value.trim(),
    price: Number(f.price.value), area: Number(f.area.value || 0), floor: f.floor.value.trim(), bedrooms: Number(f.bedrooms.value || 0),
    construction: f.construction.value.trim(), details: f.details.value.trim(), description: f.description.value.trim(),
    image_url: f.image_url.value.trim(), images: f.images.value.trim(), project_id: f.project_id.value ? Number(f.project_id.value) : null,
    furnished: f.furnished.checked, new_construction: f.new_construction.checked, published: f.published.checked,
  };
  if (!payload.title || !payload.city || !payload.type || f.price.value === '') { formMsg.textContent = 'Попълни заглавие, тип, град и цена.'; formMsg.hidden = false; return; }
  const id = f.id.value ? Number(f.id.value) : null;
  $('#save').disabled = true;
  try { await saveProp(payload, id); dlg.close(); flash(id ? 'Имотът е обновен.' : 'Имотът е добавен.'); }
  catch (err) { if (err.status === 401) { dlg.close(); showLogin(); } else { formMsg.textContent = err.message; formMsg.hidden = false; } }
  finally { $('#save').disabled = false; }
};
async function togglePub(p) {
  try { await saveProp(payloadOf(p, { published: !p.published }), p.id); flash(p.published ? 'Имотът е скрит.' : 'Имотът е публикуван.'); } catch (e) { onErr(e); }
}
async function removeProp(p) {
  if (!confirm(`Да изтрия ли „${p.title}“? Действието е необратимо.`)) return;
  try { await api('/api/properties?id=' + p.id, { method: 'DELETE' }); items = items.filter((x) => x.id !== p.id); renderProps(); loadStats().catch(() => {}); flash('Имотът е изтрит.'); } catch (e) { onErr(e); }
}
$('#seed-btn').onclick = async () => {
  if (!confirm('Да добавя ли 16 примерни имота към списъка?')) return;
  try { const d = await api('/api/admin', { method: 'POST', body: { action: 'seed' } }); await loadProps(); await loadStats(); flash(`Добавени са ${d.added} примерни имота.`); } catch (e) { onErr(e); }
};
$('#add-btn').onclick = () => openForm(null);
$('#cancel').onclick = () => dlg.close();
$('#q').oninput = renderProps;

// ---------- Запитвания ----------
function renderLeads() {
  const body = $('#lead-rows'); body.textContent = '';
  if (!leads.length) return emptyRow(body, 8, 'Още няма запитвания.');
  for (const l of leads) {
    const tr = document.createElement('tr');
    cell(tr, fdt(l.created_at), 'id');
    const k = document.createElement('td'); k.appendChild(badge(KINDS[l.kind] || l.kind, 'sale')); tr.appendChild(k);
    cell(tr, l.name, 't');
    const tp = document.createElement('td'); const a = document.createElement('a'); a.href = 'tel:' + l.phone.replace(/[^+\d]/g, ''); a.textContent = l.phone; tp.appendChild(a); tr.appendChild(tp);
    cell(tr, l.email || '—');
    const det = [l.property_title && `Имот: ${code(l.property_id)} ${l.property_title}`, l.type && `Тип: ${l.type}`, l.city && `Град: ${l.city}`, l.message].filter(Boolean).join('\n');
    cell(tr, det || '—', 'msgcell d');
    const ts = document.createElement('td'); ts.appendChild(badge(l.status === 'done' ? 'Обработено' : 'Ново', l.status === 'done' ? 'on' : 'new')); tr.appendChild(ts);
    actions(tr, [[l.status === 'done' ? 'Върни като ново' : 'Отбележи обработено', '', () => setLead(l)], ['Изтрий', 'del', () => delLead(l)]]);
    body.appendChild(tr);
  }
}
async function loadLeads() { leads = await api('/api/admin?what=leads'); renderLeads(); }
async function setLead(l) {
  try { const st = l.status === 'done' ? 'new' : 'done'; await api('/api/admin', { method: 'PATCH', body: { id: l.id, status: st } }); l.status = st; renderLeads(); loadStats().catch(() => {}); } catch (e) { onErr(e); }
}
async function delLead(l) {
  if (!confirm('Да изтрия ли запитването?')) return;
  try { await api(`/api/admin?what=lead&id=${l.id}`, { method: 'DELETE' }); leads = leads.filter((x) => x.id !== l.id); renderLeads(); loadStats().catch(() => {}); } catch (e) { onErr(e); }
}

// ---------- Потребители ----------
function renderUsers() {
  const body = $('#user-rows'); body.textContent = '';
  if (!users.length) return emptyRow(body, 6, 'Още няма регистрирани потребители.');
  for (const u of users) {
    const tr = document.createElement('tr');
    cell(tr, '#' + u.id, 'id'); cell(tr, u.email, 't'); cell(tr, u.name || '—'); cell(tr, u.favorites, 'num'); cell(tr, fdate(u.created_at));
    actions(tr, [['Изтрий', 'del', () => delUser(u)]]); body.appendChild(tr);
  }
}
async function loadUsers() { users = await api('/api/admin?what=users'); renderUsers(); }
async function delUser(u) {
  if (!confirm(`Да изтрия ли профила на ${u.email}?`)) return;
  try { await api(`/api/admin?what=user&id=${u.id}`, { method: 'DELETE' }); users = users.filter((x) => x.id !== u.id); renderUsers(); loadStats().catch(() => {}); } catch (e) { onErr(e); }
}

// ---------- Табове ----------
// ---------- Проекти ----------
const pdlg = $('#dlg-project'), prf = $('#project-form');
function renderProjects() {
  const body = $('#project-rows'); body.textContent = '';
  if (!projects.length) return emptyRow(body, 6, 'Още няма проекти.');
  for (const p of projects) {
    const tr = document.createElement('tr');
    cell(tr, '#' + p.id, 'id'); cell(tr, p.name, 't'); cell(tr, [p.city, p.district].filter(Boolean).join(' / ')); cell(tr, p.stage || '—');
    const ts = document.createElement('td'); ts.appendChild(badge(p.published ? 'Публикуван' : 'Скрит', p.published ? 'on' : 'off')); tr.appendChild(ts);
    actions(tr, [['Редактирай', '', () => openProject(p)], ['Изтрий', 'del', () => delProject(p)]]); body.appendChild(tr);
  }
}
async function loadProjects() { projects = await api('/api/projects?all=1'); renderProjects(); }
function openProject(p) {
  prf.reset(); $('#project-msg').hidden = true; const f = prf.elements;
  $('#dlg-project-title').textContent = p ? 'Редакция на проект' : 'Нов проект';
  f.id.value = p ? p.id : '';
  if (p) { ['name', 'city', 'district', 'stage', 'image_url', 'tagline', 'description'].forEach((k) => { f[k].value = p[k] || ''; }); f.published.checked = !!p.published; }
  pdlg.showModal(); f.name.focus();
}
prf.onsubmit = async (e) => {
  e.preventDefault(); const f = prf.elements, msg = $('#project-msg'); msg.hidden = true;
  const body = { name: f.name.value.trim(), city: f.city.value.trim(), district: f.district.value.trim(), stage: f.stage.value.trim(), image_url: f.image_url.value.trim(), tagline: f.tagline.value.trim(), description: f.description.value.trim(), published: f.published.checked };
  if (!body.name || !body.city) { msg.textContent = 'Попълни име и град.'; msg.hidden = false; return; }
  const id = f.id.value ? Number(f.id.value) : null;
  try {
    const saved = await api('/api/projects', { method: id ? 'PUT' : 'POST', body: id ? { ...body, id } : body });
    const i = projects.findIndex((x) => x.id === saved.id); if (i >= 0) projects[i] = saved; else projects.unshift(saved);
    renderProjects(); fillProjectSelect(); loadStats().catch(() => {}); pdlg.close(); flash(id ? 'Проектът е обновен.' : 'Проектът е добавен.');
  } catch (err) { if (err.status === 401) { pdlg.close(); showLogin(); } else { msg.textContent = err.message; msg.hidden = false; } }
};
async function delProject(p) {
  if (!confirm(`Да изтрия ли проект „${p.name}“? Имотите му остават, но без проект.`)) return;
  try { await api('/api/projects?id=' + p.id, { method: 'DELETE' }); projects = projects.filter((x) => x.id !== p.id); renderProjects(); loadStats().catch(() => {}); flash('Проектът е изтрит.'); } catch (e) { onErr(e); }
}
$('#add-project').onclick = () => openProject(null);

// ---------- Блог ----------
const bdlg = $('#dlg-post'), bf = $('#post-form');
function renderPosts() {
  const body = $('#post-rows'); body.textContent = '';
  if (!posts.length) return emptyRow(body, 5, 'Още няма статии.');
  for (const p of posts) {
    const tr = document.createElement('tr');
    cell(tr, fdate(p.created_at), 'id'); cell(tr, p.title, 't'); cell(tr, '/post?slug=' + p.slug, 'd');
    const ts = document.createElement('td'); ts.appendChild(badge(p.published ? 'Публикувана' : 'Чернова', p.published ? 'on' : 'off')); tr.appendChild(ts);
    actions(tr, [['Редактирай', '', () => openPost(p)], ['Изтрий', 'del', () => delPost(p)]]); body.appendChild(tr);
  }
}
async function loadPosts() { posts = await api('/api/posts?all=1'); renderPosts(); }
function openPost(p) {
  bf.reset(); $('#post-msg').hidden = true; const f = bf.elements;
  $('#dlg-post-title').textContent = p ? 'Редакция на статия' : 'Нова статия';
  f.id.value = p ? p.id : '';
  if (p) { ['title', 'slug', 'excerpt', 'body', 'cover_url'].forEach((k) => { f[k].value = p[k] || ''; }); f.published.checked = !!p.published; }
  bdlg.showModal(); f.title.focus();
}
bf.onsubmit = async (e) => {
  e.preventDefault(); const f = bf.elements, msg = $('#post-msg'); msg.hidden = true;
  const body = { title: f.title.value.trim(), slug: f.slug.value.trim(), excerpt: f.excerpt.value.trim(), body: f.body.value.trim(), cover_url: f.cover_url.value.trim(), published: f.published.checked };
  if (!body.title) { msg.textContent = 'Попълни заглавие.'; msg.hidden = false; return; }
  const id = f.id.value ? Number(f.id.value) : null;
  try {
    const saved = await api('/api/posts', { method: id ? 'PUT' : 'POST', body: id ? { ...body, id } : body });
    const i = posts.findIndex((x) => x.id === saved.id); if (i >= 0) posts[i] = saved; else posts.unshift(saved);
    renderPosts(); loadStats().catch(() => {}); bdlg.close(); flash(id ? 'Статията е обновена.' : 'Статията е добавена.');
  } catch (err) { if (err.status === 401) { bdlg.close(); showLogin(); } else { msg.textContent = err.message; msg.hidden = false; } }
};
async function delPost(p) {
  if (!confirm(`Да изтрия ли статията „${p.title}“?`)) return;
  try { await api('/api/posts?id=' + p.id, { method: 'DELETE' }); posts = posts.filter((x) => x.id !== p.id); renderPosts(); loadStats().catch(() => {}); flash('Статията е изтрита.'); } catch (e) { onErr(e); }
}
$('#add-post').onclick = () => openPost(null);
$$('[data-close]').forEach((b) => (b.onclick = () => b.closest('dialog').close()));

const loaders = { props: loadProps, leads: loadLeads, projects: loadProjects, posts: loadPosts, users: loadUsers };
async function setTab(t) {
  tab = t;
  $$('.adm-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  ['props', 'leads', 'projects', 'posts', 'users'].forEach((x) => ($('#tab-' + x).hidden = x !== t));
  try { await loaders[t](); } catch (e) { onErr(e); }
}
$$('.adm-tabs button').forEach((b) => (b.onclick = () => setTab(b.dataset.tab)));

async function boot() {
  try { await loadStats(); showDash(); await setTab(tab); }
  catch (e) { if (e.status === 401) showLogin(); else { showDash(); flash(e.message, true); } }
}

// ---------- Вход / изход ----------
$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  const msg = $('#login-msg'); msg.hidden = true;
  try { await api('/api/auth', { method: 'POST', body: { password: e.target.elements.password.value } }); e.target.reset(); await boot(); }
  catch (err) { msg.textContent = err.message; msg.hidden = false; }
};
logoutBtn.onclick = async () => { try { await api('/api/auth', { method: 'DELETE' }); } catch (_) {} items = []; leads = []; users = []; showLogin(); };
boot();
