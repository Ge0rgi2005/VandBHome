const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const loginView = $('#login-view'), dashView = $('#dash-view'), logoutBtn = $('#logout');
const flashEl = $('#flash');
const dlg = $('#dlg'), pform = $('#prop-form'), formMsg = $('#form-msg');
let items = [], leads = [], users = [], projects = [], posts = [], contacts = [], tab = 'props';

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
    cell(tr, (p.featured ? '★ ' : '') + p.title, 't');
    const tdD = document.createElement('td'); tdD.appendChild(badge(p.deal === 'rent' ? 'Наем' : 'Продажба', p.deal === 'rent' ? 'rent' : 'sale'));
    if (p.new_construction) { tdD.appendChild(document.createTextNode(' ')); tdD.appendChild(badge('Ново', 'new')); }
    tr.appendChild(tdD);
    cell(tr, p.type || '—');
    cell(tr, [p.city, p.district].filter(Boolean).join(' / '));
    cell(tr, p.area ? fmt(p.area) + ' м²' : '—', 'num');
    cell(tr, fmt(p.price) + ' €' + (p.deal === 'rent' ? '/мес.' : ''), 'num');
    const tdS = document.createElement('td'); tdS.appendChild(badge(p.published ? 'Публикуван' : 'Скрит', p.published ? 'on' : 'off')); tr.appendChild(tdS);
    actions(tr, [[p.published ? 'Скрий' : 'Покажи', '', () => togglePub(p)], ['Редактирай', '', () => openForm(p)], ['Дублирай', '', () => dupProp(p)], ['Изтрий', 'del', () => removeProp(p)]]);
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
    ['title', 'deal', 'type', 'city', 'district', 'price', 'area', 'floor', 'bedrooms', 'construction', 'details', 'description', 'image_url', 'images', 'badge'].forEach((k) => { f[k].value = p[k] ?? ''; });
    f.featured.checked = !!p.featured;
    f.project_id.value = p.project_id == null ? '' : String(p.project_id);
    f.furnished.checked = !!p.furnished; f.new_construction.checked = !!p.new_construction; f.published.checked = !!p.published;
  } else { f.published.checked = true; }
  dlg.showModal(); f.title.focus();
}
const payloadOf = (p, over = {}) => ({
  title: p.title, deal: p.deal, type: p.type, city: p.city, district: p.district, price: p.price, area: p.area, floor: p.floor,
  bedrooms: p.bedrooms, construction: p.construction, details: p.details, description: p.description, image_url: p.image_url,
  images: p.images, project_id: p.project_id, badge: p.badge, featured: p.featured, furnished: p.furnished, new_construction: p.new_construction, published: p.published, ...over,
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
    image_url: f.image_url.value.trim(), images: f.images.value.trim(), project_id: f.project_id.value ? Number(f.project_id.value) : null, badge: f.badge.value.trim(), featured: f.featured.checked,
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
async function dupProp(p) {
  try { await saveProp(payloadOf(p, { title: p.title + ' (копие)', published: false }), null); flash('Копието е създадено като скрито.'); } catch (e) { onErr(e); }
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
    const det = [l.note && `📝 ${l.note}`, l.property_title && `Имот: ${code(l.property_id)} ${l.property_title}`, l.type && `Тип: ${l.type}`, l.city && `Град: ${l.city}`, l.message].filter(Boolean).join('\n');
    cell(tr, det || '—', 'msgcell d');
    const ts = document.createElement('td'); ts.appendChild(badge(l.status === 'done' ? 'Обработено' : 'Ново', l.status === 'done' ? 'on' : 'new')); tr.appendChild(ts);
    actions(tr, [['Профил', '', () => openProfile({ phone: l.phone, uid: l.user_id })], [l.status === 'done' ? 'Върни като ново' : 'Обработено', '', () => setLead(l)], ['Изтрий', 'del', () => delLead(l)]]);
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
    actions(tr, [['Профил', '', () => openProfile({ uid: u.id })], ['Изтрий', 'del', () => delUser(u)]]); body.appendChild(tr);
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

const loaders = { props: loadProps, leads: loadLeads, projects: loadProjects, posts: loadPosts, users: loadUsers, content: loadContent, contacts: loadContacts };
async function setTab(t) {
  tab = t;
  $$('.adm-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === t));
  ['props', 'leads', 'projects', 'posts', 'users', 'content', 'contacts'].forEach((x) => ($('#tab-' + x).hidden = x !== t));
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


// ====================== Качване на снимки ======================
const filePick = $('#file-pick');
function loadImg(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Файлът не е валидна снимка.')); };
    img.src = url;
  });
}
async function uploadFile(file) {
  const img = await loadImg(file);
  const max = 1600, k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height);
  let q = 0.86, data = c.toDataURL('image/jpeg', q);
  while (data.length > 3_000_000 && q > 0.4) { q -= 0.12; data = c.toDataURL('image/jpeg', q); }
  const d = await api('/api/image', { method: 'POST', body: { data } });
  return d.url;
}
// pickImage() -> обещание с адрес на качената снимка (или null при отказ)
function pickImage() {
  return new Promise((resolve) => {
    filePick.value = '';
    filePick.onchange = async () => {
      const f = filePick.files[0]; if (!f) return resolve(null);
      flash('Качване на снимката…');
      try { const u = await uploadFile(f); flash('Снимката е качена.'); resolve(u); } catch (e) { onErr(e); resolve(null); }
    };
    filePick.click();
  });
}
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-upload]'); if (!b) return;
  const form = b.closest('form'); const field = form.elements[b.dataset.upload];
  const url = await pickImage(); if (!url) return;
  field.value = b.hasAttribute('data-append') && field.value.trim() ? field.value.trim() + '\n' + url : url;
  field.dispatchEvent(new Event('input', { bubbles: true }));
});

// ====================== Редактор на съдържанието ======================
const T = (p, label, t = 'text', extra = {}) => ({ p, label, t, ...extra });
const ED = [
  { title: 'Цветове и тема', fields: [T('theme.primary', 'Основен цвят (бутони, връзки)', 'color'), T('theme.accent', 'Акцентен цвят (оранжев бутон, етикети)', 'color'), T('theme.dark', 'Тъмен цвят (заглавни секции, футър)', 'color')] },
  { title: 'Контакти и социални мрежи', fields: [T('contact.phone', 'Телефон'), T('contact.email', 'Имейл'), T('contact.address', 'Адрес'), T('contact.hours', 'Работно време'), T('contact.facebook', 'Facebook (адрес)'), T('contact.instagram', 'Instagram (адрес)'), T('contact.youtube', 'YouTube (адрес)')] },
  { title: 'Горна лента', fields: [T('topbar.visible', 'Показвай лентата', 'bool'), T('topbar.text', 'Текст'), T('topbar.link_text', 'Текст на връзката'), T('topbar.link', 'Връзка (напр. /careers)')] },
  { title: 'Футър', fields: [T('footer.about', 'Кратко описание', 'area'), T('footer.legal', 'Юридически текст', 'area')] },
  { title: 'Начална страница – горна част', fields: [T('home.hero_title', 'Заглавие'), T('home.hero_em', 'Подчертана част'), T('home.hero_lead', 'Подзаглавие', 'area'), T('home.hero_note', 'Бележка под точките'), T('home.hero_image', 'Фонова снимка (по желание)', 'image'), T('home.checks', 'Точки под заглавието', 'strings'), T('home.live', '„На живо“ съобщения', 'strings')] },
  { title: 'Начална страница – секции (покажи/скрий)', fields: [['offers', 'Оферти от купувачи'], ['how', 'Как работи'], ['numbers', 'Числа'], ['listings', 'Актуални обяви'], ['novo', 'Лента „Ново строителство“'], ['reviews', 'Отзиви'], ['faq', 'Въпроси']].map(([k, l]) => T('home.show.' + k, l, 'bool')) },
  { title: 'Начална – оферти от купувачи', fields: [T('home.offers_eyebrow', 'Малко заглавие'), T('home.offers_title', 'Заглавие'), T('home.offers_sub', 'Подзаглавие'), T('home.offers', 'Оферти', 'list', { item: [T('initials', 'Инициали'), T('name', 'Име'), T('amount', 'Сума'), T('top', 'Най-висока оферта', 'bool')], label1: 'Оферта' })] },
  { title: 'Начална – как работи', fields: [T('home.how_eyebrow', 'Малко заглавие'), T('home.how_title', 'Заглавие'), T('home.how_sub', 'Подзаглавие'), T('home.how', 'Стъпки', 'list', { item: [T('title', 'Заглавие'), T('text', 'Текст', 'area')], label1: 'Стъпка' })] },
  { title: 'Начална – числа', fields: [T('home.numbers_eyebrow', 'Малко заглавие'), T('home.numbers_title', 'Заглавие'), T('home.numbers_sub', 'Подзаглавие'), T('home.stats', 'Числа', 'list', { item: [T('value', 'Стойност'), T('label', 'Описание')], label1: 'Число' })] },
  { title: 'Начална – обяви, ново строителство, призив', fields: [T('home.listings_eyebrow', 'Малко заглавие (обяви)'), T('home.listings_title', 'Заглавие (обяви)'), T('home.novo_title', 'Лента „Ново строителство“ – заглавие'), T('home.novo_text', 'Лента „Ново строителство“ – текст', 'area'), T('home.cta_title', 'Призив – заглавие'), T('home.cta_text', 'Призив – текст')] },
  { title: 'Начална – отзиви', fields: [T('home.reviews_eyebrow', 'Малко заглавие'), T('home.reviews_title', 'Заглавие'), T('home.rating_text', 'Редът с оценките'), T('home.reviews', 'Отзиви', 'list', { item: [T('text', 'Текст', 'area'), T('author', 'Автор')], label1: 'Отзив' })] },
  { title: 'Начална – въпроси', fields: [T('home.faq_eyebrow', 'Малко заглавие'), T('home.faq_title', 'Заглавие'), T('home.faq', 'Въпроси', 'list', { item: [T('q', 'Въпрос'), T('a', 'Отговор', 'area')], label1: 'Въпрос' })] },
  { title: 'Заглавия на страниците', fields: [['properties', 'Търси имот'], ['newc', 'Ново строителство'], ['mortgage', 'Ипотечен кредит'], ['advert', 'Обяви имот'], ['about', 'За нас'], ['members', 'Екип'], ['careers', 'Кариери'], ['stipendii', 'Стипендии'], ['blog', 'Блог']].flatMap(([k, l]) => [T(`pages.${k}.title`, `${l} – заглавие`), T(`pages.${k}.lead`, `${l} – подзаглавие`, 'area')]) },
  { title: 'Страница „За нас“', fields: [T('about.mission_title', 'Мисия – заглавие'), T('about.mission_text', 'Мисия – текст (абзаците се разделят с празен ред)', 'area'), T('about.stats', 'Числа', 'list', { item: [T('value', 'Стойност'), T('label', 'Описание')], label1: 'Число' }), T('about.values_title', 'Ценности – заглавие'), T('about.values', 'Ценности', 'list', { item: [T('title', 'Заглавие'), T('text', 'Текст', 'area')], label1: 'Ценност' }), T('about.offices', 'Офиси', 'list', { item: [T('name', 'Име'), T('address', 'Адрес'), T('phone', 'Телефон')], label1: 'Офис' })] },
  { title: 'Екип (брокери)', fields: [T('team', 'Хора', 'list', { item: [T('name', 'Име'), T('role', 'Длъжност'), T('city', 'Град'), T('office', 'Офис'), T('photo', 'Снимка', 'image')], label1: 'Човек' })] },
  { title: 'Кариери – позиции', fields: [T('jobs', 'Позиции', 'list', { item: [T('title', 'Позиция'), T('meta', 'Град и условия')], label1: 'Позиция' })] },
];
let doc = null;
const getP = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
const setP = (o, p, v) => { const ks = p.split('.'); const last = ks.pop(); const t = ks.reduce((x, k) => x[k], o); t[last] = v; };
const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

function fieldEl(obj, f, base) {
  // obj – обектът, в който живее полето; f.p – ключ спрямо obj (за списъци) или пълен път (за корена)
  const get = () => getP(obj, f.p), set = (v) => { setP(obj, f.p, v); dirty(); };
  const lab = mk('label', f.t === 'bool' ? 'check' : '');
  if (f.t === 'bool') {
    const i = mk('input'); i.type = 'checkbox'; i.checked = !!get(); i.onchange = () => set(i.checked); lab.append(i, document.createTextNode(' ' + f.label)); return lab;
  }
  if (f.t === 'strings') return stringsEl(obj, f);
  if (f.t === 'list') return listEl(obj, f);
  lab.append(document.createTextNode(f.label));
  if (f.t === 'color') {
    const wrap = mk('span', 'ed-color'); const c = mk('input'); c.type = 'color'; c.value = get() || '#000000';
    const t = mk('input'); t.type = 'text'; t.value = get() || ''; t.maxLength = 7;
    c.oninput = () => { t.value = c.value; set(c.value); }; t.oninput = () => { if (/^#[0-9a-f]{6}$/i.test(t.value)) { c.value = t.value; set(t.value); } };
    wrap.append(c, t); lab.append(wrap); return lab;
  }
  if (f.t === 'image') {
    const row = mk('span', 'up-row'); const t = mk('input'); t.type = 'text'; t.value = get() || ''; t.placeholder = 'https://… или качи';
    const up = mk('button', 'btn btn-ghost btn-sm', 'Качи'); up.type = 'button';
    const clr = mk('button', 'btn btn-ghost btn-sm', '×'); clr.type = 'button'; clr.title = 'Изчисти';
    t.oninput = () => set(t.value.trim()); up.onclick = async () => { const u = await pickImage(); if (u) { t.value = u; set(u); } }; clr.onclick = () => { t.value = ''; set(''); };
    row.append(t, up, clr); lab.append(row);
    return lab;
  }
  const inp = mk(f.t === 'area' ? 'textarea' : 'input'); if (f.t !== 'area') inp.type = 'text';
  inp.value = get() ?? ''; inp.oninput = () => set(inp.value); lab.append(inp); return lab;
}
function stringsEl(obj, f) {
  const box = mk('div', 'ed-list'); box.append(mk('b', '', f.label));
  const arr = getP(obj, f.p);
  const draw = () => {
    box.querySelectorAll('.ed-row').forEach((r) => r.remove());
    arr.forEach((v, i) => {
      const r = mk('div', 'up-row ed-row'); const t = mk('input'); t.type = 'text'; t.value = v; t.oninput = () => { arr[i] = t.value; dirty(); };
      const d = mk('button', 'ibtn del', '×'); d.type = 'button'; d.onclick = () => { arr.splice(i, 1); dirty(); draw(); };
      r.append(t, d); box.insertBefore(r, add);
    });
  };
  const add = mk('button', 'btn btn-ghost btn-sm', '+ Добави'); add.type = 'button'; add.style.justifySelf = 'start'; add.onclick = () => { arr.push(''); dirty(); draw(); };
  box.append(add); draw(); return box;
}
function listEl(obj, f) {
  const box = mk('div', 'ed-list'); box.append(mk('b', '', f.label));
  const arr = getP(obj, f.p);
  const blank = () => Object.fromEntries(f.item.map((x) => [x.p, x.t === 'bool' ? false : '']));
  const draw = () => {
    box.querySelectorAll('.ed-item').forEach((r) => r.remove());
    arr.forEach((it, i) => {
      const card = mk('div', 'ed-item'); const top = mk('div', 'ed-top'); top.append(mk('span', '', `${f.label1 || 'Елемент'} ${i + 1}`));
      const ctr = mk('span');
      const btn = (t, fn, cls = 'ibtn') => { const b = mk('button', cls, t); b.type = 'button'; b.onclick = fn; ctr.append(b); };
      btn('↑', () => { if (i > 0) { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; dirty(); draw(); } });
      btn('↓', () => { if (i < arr.length - 1) { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; dirty(); draw(); } });
      btn('Изтрий', () => { arr.splice(i, 1); dirty(); draw(); }, 'ibtn del');
      top.append(ctr); card.append(top);
      f.item.forEach((sub) => card.append(fieldEl(it, sub)));
      box.insertBefore(card, add);
    });
  };
  const add = mk('button', 'btn btn-ghost btn-sm', '+ Добави'); add.type = 'button'; add.style.justifySelf = 'start'; add.onclick = () => { arr.push(blank()); dirty(); draw(); };
  box.append(add); draw(); return box;
}
function dirty() { $('#ed-state').textContent = 'Има незаписани промени'; }
function renderEditor() {
  const ed = $('#editor'); ed.textContent = '';
  ED.forEach((sec, n) => {
    const d = mk('details', 'ed-sec'); if (n === 0) d.open = true;
    d.append(mk('summary', '', sec.title));
    const body = mk('div', 'ed-body');
    sec.fields.forEach((f) => body.append(fieldEl(doc, f)));
    d.append(body); ed.append(d);
  });
  $('#ed-state').textContent = '';
}
async function loadContent() { doc = await api('/api/site'); renderEditor(); }
$('#ed-save').onclick = async () => {
  try { doc = await api('/api/site', { method: 'PUT', body: doc }); $('#ed-state').textContent = 'Записано ✓'; flash('Съдържанието е записано.'); } catch (e) { onErr(e); }
};
$('#ed-reset').onclick = async () => {
  if (!confirm('Да върна ли ВСИЧКИ текстове и настройки по подразбиране? Качените снимки остават.')) return;
  try { doc = await api('/api/site', { method: 'DELETE' }); renderEditor(); flash('Върнати са стойностите по подразбиране.'); } catch (e) { onErr(e); }
};

// ====================== Контакти и профили ======================
const csvEsc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
function downloadCsv(name, rows) {
  const blob = new Blob(['\ufeff' + rows.map((r) => r.map(csvEsc).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}
function renderContacts() {
  const q = $('#q-contacts').value.trim().toLowerCase();
  const list = contacts.filter((c) => !q || `${c.name} ${c.phone} ${c.email || ''}`.toLowerCase().includes(q));
  $('#contacts-count').textContent = `${contacts.length} контакта · ${contacts.filter((c) => c.user_id).length} с регистриран профил`;
  const body = $('#contact-rows'); body.textContent = '';
  if (!list.length) return emptyRow(body, 7, contacts.length ? 'Няма резултати.' : 'Още няма контакти.');
  for (const c of list) {
    const tr = document.createElement('tr');
    cell(tr, c.name, 't');
    const tp = document.createElement('td'); const a = document.createElement('a'); a.href = 'tel:' + c.phone.replace(/[^+\d]/g, ''); a.textContent = c.phone; tp.appendChild(a); tr.appendChild(tp);
    cell(tr, c.email || '—'); cell(tr, c.requests, 'num'); cell(tr, fdt(c.last_at));
    const tpf = document.createElement('td'); tpf.appendChild(badge(c.user_id ? 'Регистриран' : 'Гост', c.user_id ? 'on' : 'off'));
    if (c.has_new) { tpf.appendChild(document.createTextNode(' ')); tpf.appendChild(badge('Ново', 'new')); }
    tr.appendChild(tpf);
    actions(tr, [['Виж профила', '', () => openProfile({ phone: c.phone, uid: c.user_id })]]); body.appendChild(tr);
  }
}
async function loadContacts() { contacts = await api('/api/admin?what=contacts'); renderContacts(); }
$('#q-contacts').oninput = renderContacts;
$('#csv-contacts').onclick = () => downloadCsv('kontakti.csv', [['Име', 'Телефон', 'Имейл', 'Запитвания', 'Последно', 'Профил'], ...contacts.map((c) => [c.name, c.phone, c.email || '', c.requests, fdt(c.last_at), c.user_id ? 'да' : 'не'])]);

const profDlg = $('#dlg-profile');
$('#prof-close').onclick = () => profDlg.close();
async function openProfile({ phone, uid }) {
  const body = $('#prof-body'); body.textContent = ''; body.appendChild(mk('p', 'empty', 'Зареждане…'));
  $('#prof-title').textContent = 'Профил'; profDlg.showModal();
  try {
    const qs = new URLSearchParams({ what: 'profile' }); if (uid) qs.set('uid', uid); else if (phone) qs.set('phone', phone);
    const d = await api('/api/admin?' + qs);
    body.textContent = '';
    const name = (d.user && d.user.name) || (d.leads[0] && d.leads[0].name) || (d.user && d.user.email) || 'Контакт';
    $('#prof-title').textContent = name;
    const info = mk('div', 'prof-card'); info.append(mk('h3', '', 'Данни'));
    const line = (l, v) => { const p = mk('p'); const b = mk('b', '', l + ': '); p.append(b, document.createTextNode(v || '—')); info.append(p); };
    const ph = phone || (d.leads[0] && d.leads[0].phone);
    line('Телефон', ph); line('Имейл', (d.user && d.user.email) || (d.leads.find((l) => l.email) || {}).email);
    line('Регистриран профил', d.user ? `да, от ${fdate(d.user.created_at)}` : 'не'); line('Общо запитвания', String(d.leads.length));
    body.append(info);
    const fav = mk('div', 'prof-card'); fav.append(mk('h3', '', `Любими имоти (${d.favorites.length})`));
    if (!d.favorites.length) fav.append(mk('p', '', d.user ? 'Няма запазени имоти.' : 'Контактът няма регистриран профил.'));
    d.favorites.forEach((f) => { const p = mk('p'); const a = document.createElement('a'); a.href = '/property?id=' + f.id; a.target = '_blank'; a.rel = 'noopener'; a.textContent = `${code(f.id)} ${f.title}`; p.append(a, document.createTextNode(` · ${fmt(f.price)} €${f.price !== f.price_saved ? ` (при запазване ${fmt(f.price_saved)} €)` : ''}`)); fav.append(p); });
    body.append(fav);
    const lc = mk('div', 'prof-card'); lc.append(mk('h3', '', 'Запитвания и бележки'));
    if (!d.leads.length) lc.append(mk('p', '', 'Няма запитвания.'));
    d.leads.forEach((l) => {
      const box = mk('div'); box.style.cssText = 'border-top:1px solid var(--line);padding-top:10px;margin-top:10px';
      const head = mk('p'); head.append(mk('b', '', `${KINDS[l.kind] || l.kind} · ${fdt(l.created_at)}`), document.createTextNode(` · ${l.status === 'done' ? 'обработено' : 'ново'}`)); box.append(head);
      const det = [l.property_title && `Имот: ${code(l.property_id)} ${l.property_title}`, l.type && `Тип: ${l.type}`, l.city && `Град: ${l.city}`, l.message].filter(Boolean).join(' · ');
      if (det) box.append(mk('p', '', det));
      const ta = mk('textarea'); ta.value = l.note || ''; ta.placeholder = 'Бележка (видима само за админите)'; ta.maxLength = 2000;
      const row = mk('div', 'up-row'); row.style.marginTop = '6px';
      const save = mk('button', 'btn btn-ghost btn-sm', 'Запази бележката'); save.type = 'button';
      save.onclick = async () => { try { await api('/api/admin', { method: 'PATCH', body: { id: l.id, note: ta.value } }); l.note = ta.value; flash('Бележката е записана.'); } catch (e) { onErr(e); } };
      const st = mk('button', 'btn btn-ghost btn-sm', l.status === 'done' ? 'Върни като ново' : 'Отбележи обработено'); st.type = 'button';
      st.onclick = async () => { try { const s2 = l.status === 'done' ? 'new' : 'done'; await api('/api/admin', { method: 'PATCH', body: { id: l.id, status: s2 } }); l.status = s2; openProfile({ phone, uid }); loadStats().catch(() => {}); } catch (e) { onErr(e); } };
      row.append(save, st); box.append(ta, row); lc.append(box);
    });
    body.append(lc);
  } catch (e) { profDlg.close(); onErr(e); }
}

// CSV на запитванията
const lcsv = document.createElement('button'); lcsv.className = 'btn btn-ghost btn-sm'; lcsv.textContent = 'Изтегли CSV'; lcsv.style.marginBottom = '12px';
lcsv.onclick = () => downloadCsv('zapitvaniya.csv', [['Дата', 'Вид', 'Име', 'Телефон', 'Имейл', 'Тип', 'Град', 'Имот', 'Съобщение', 'Бележка', 'Статус'], ...leads.map((l) => [fdt(l.created_at), KINDS[l.kind] || l.kind, l.name, l.phone, l.email, l.type, l.city, l.property_title || '', l.message, l.note || '', l.status])]);
$('#tab-leads').prepend(lcsv);
