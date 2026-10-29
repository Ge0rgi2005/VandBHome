const $ = (s) => document.querySelector(s);
const loginView = $('#login-view'), dashView = $('#dash-view'), logoutBtn = $('#logout');
const rowsEl = $('#rows'), countEl = $('#count'), flashEl = $('#flash');
const dlg = $('#dlg'), pform = $('#prop-form'), formMsg = $('#form-msg');
let items = [];

const fmt = (n) => Number(n).toLocaleString('bg-BG') + ' €';
const fdate = (s) => new Date(s).toLocaleDateString('bg-BG');

async function api(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'same-origin',
    headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch (_) {}
  if (!res.ok) {
    const err = new Error((data && data.error) || 'Грешка ' + res.status);
    err.status = res.status;
    throw err;
  }
  return data;
}

function flash(text, isErr) {
  flashEl.textContent = text;
  flashEl.className = 'flash' + (isErr ? ' err' : '');
  flashEl.hidden = false;
  clearTimeout(flash.t);
  flash.t = setTimeout(() => (flashEl.hidden = true), 4000);
}

function showLogin() { loginView.hidden = false; dashView.hidden = true; logoutBtn.hidden = true; }
function showDash() { loginView.hidden = true; dashView.hidden = false; logoutBtn.hidden = false; }

// ---------- Таблица ----------
function cell(tr, text, cls) {
  const td = document.createElement('td');
  if (cls) td.className = cls;
  td.textContent = text;
  tr.appendChild(td);
  return td;
}

function render() {
  const q = $('#q').value.trim().toLowerCase();
  const list = items.filter((p) => !q || (p.title + ' ' + p.city).toLowerCase().includes(q));
  countEl.textContent = `${items.length} общо · ${items.filter((p) => p.published).length} публикувани`;
  rowsEl.textContent = '';

  if (!list.length) {
    const tr = document.createElement('tr');
    const td = cell(tr, items.length ? 'Няма резултати.' : 'Още няма имоти. Натисни „Добави имот“.', 'empty');
    td.colSpan = 9;
    rowsEl.appendChild(tr);
    return;
  }

  for (const p of list) {
    const tr = document.createElement('tr');
    cell(tr, '#' + p.id, 'id');

    const tdImg = document.createElement('td');
    if (p.image_url) {
      const img = document.createElement('img');
      img.className = 'thumb'; img.alt = ''; img.loading = 'lazy'; img.src = p.image_url;
      tdImg.appendChild(img);
    } else {
      const ph = document.createElement('div'); ph.className = 'thumb'; tdImg.appendChild(ph);
    }
    tr.appendChild(tdImg);

    cell(tr, p.title, 't');
    cell(tr, p.city);
    cell(tr, p.details || '—', 'd');
    cell(tr, fmt(p.price), 'num');

    const tdSt = document.createElement('td');
    const b = document.createElement('span');
    b.className = 'badge ' + (p.published ? 'on' : 'off');
    b.textContent = p.published ? 'Публикуван' : 'Скрит';
    tdSt.appendChild(b); tr.appendChild(tdSt);

    cell(tr, fdate(p.created_at));

    const tdA = document.createElement('td'); tdA.className = 'act';
    const mk = (label, cls, fn) => {
      const btn = document.createElement('button');
      btn.className = 'ibtn ' + cls; btn.textContent = label; btn.onclick = fn; tdA.appendChild(btn);
    };
    mk(p.published ? 'Скрий' : 'Покажи', '', () => togglePublished(p));
    mk('Редактирай', '', () => openForm(p));
    mk('Изтрий', 'del', () => remove(p));
    tr.appendChild(tdA);
    rowsEl.appendChild(tr);
  }

  const cities = [...new Set(items.map((p) => p.city))].sort();
  $('#cities').innerHTML = '';
  cities.forEach((c) => { const o = document.createElement('option'); o.value = c; $('#cities').appendChild(o); });
}

async function load() {
  try {
    items = await api('/api/properties?all=1');
    showDash(); render();
  } catch (e) {
    if (e.status === 401) showLogin();
    else { showDash(); countEl.textContent = ''; flash(e.message, true); }
  }
}

// ---------- Действия ----------
function openForm(p) {
  pform.reset();
  formMsg.hidden = true;
  $('#dlg-title').textContent = p ? 'Редакция на имот' : 'Нов имот';
  pform.id.value = p ? p.id : '';
  if (p) {
    pform.title.value = p.title; pform.city.value = p.city; pform.price.value = p.price;
    pform.details.value = p.details; pform.image_url.value = p.image_url; pform.published.checked = p.published;
  } else {
    pform.published.checked = true;
  }
  dlg.showModal();
  pform.title.focus();
}

async function savePayload(payload, id) {
  const saved = await api('/api/properties', { method: id ? 'PUT' : 'POST', body: id ? { ...payload, id } : payload });
  const i = items.findIndex((x) => x.id === saved.id);
  if (i >= 0) items[i] = saved; else items.unshift(saved);
  render();
}

pform.onsubmit = async (e) => {
  e.preventDefault();
  formMsg.hidden = true;
  const payload = {
    title: pform.title.value.trim(),
    city: pform.city.value.trim(),
    price: Number(pform.price.value),
    details: pform.details.value.trim(),
    image_url: pform.image_url.value.trim(),
    published: pform.published.checked,
  };
  if (!payload.title || !payload.city || pform.price.value === '') {
    formMsg.textContent = 'Попълни заглавие, град и цена.'; formMsg.hidden = false; return;
  }
  const id = pform.id.value ? Number(pform.id.value) : null;
  $('#save').disabled = true;
  try {
    await savePayload(payload, id);
    dlg.close();
    flash(id ? 'Имотът е обновен.' : 'Имотът е добавен.');
  } catch (err) {
    if (err.status === 401) { dlg.close(); showLogin(); }
    else { formMsg.textContent = err.message; formMsg.hidden = false; }
  } finally { $('#save').disabled = false; }
};

async function togglePublished(p) {
  try {
    await savePayload({ title: p.title, city: p.city, price: p.price, details: p.details, image_url: p.image_url, published: !p.published }, p.id);
    flash(p.published ? 'Имотът е скрит от сайта.' : 'Имотът е публикуван.');
  } catch (e) { e.status === 401 ? showLogin() : flash(e.message, true); }
}

async function remove(p) {
  if (!confirm(`Да изтрия ли „${p.title}“? Действието е необратимо.`)) return;
  try {
    await api('/api/properties?id=' + p.id, { method: 'DELETE' });
    items = items.filter((x) => x.id !== p.id);
    render(); flash('Имотът е изтрит.');
  } catch (e) { e.status === 401 ? showLogin() : flash(e.message, true); }
}

$('#add-btn').onclick = () => openForm(null);
$('#cancel').onclick = () => dlg.close();
$('#q').oninput = render;

// ---------- Вход / изход ----------
$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  const msg = $('#login-msg'); msg.hidden = true;
  try {
    await api('/api/auth', { method: 'POST', body: { password: e.target.password.value } });
    e.target.reset();
    await load();
  } catch (err) { msg.textContent = err.message; msg.hidden = false; }
};

logoutBtn.onclick = async () => {
  try { await api('/api/auth', { method: 'DELETE' }); } catch (_) {}
  items = []; showLogin();
};

load();
