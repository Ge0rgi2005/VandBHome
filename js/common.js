/* VandBHome – общ код: хедър, футър, вход/регистрация, любими, карти, формуляри */
(function () {
  const TYPES = ['1-стаен','2-стаен','3-стаен','4-стаен','Многостаен','Мезонет','Къща','Вила','Етаж от къща','Офис','Магазин','Заведение','Склад','Парцел','Гараж'];
  const CITIES = ['София','Пловдив','Варна','Бургас','Русе'];
  const PALETTE = [['#0B1F3A','#7FB2FF'],['#1E6BFF','#FF8A5B'],['#07142A','#7FB2FF'],['#3B82FF','#F2F7FF'],['#0B1F3A','#FF8A5B'],['#1F5A62','#9ED0C9'],['#07142A','#FF8A5B'],['#1E6BFF','#F2F7FF']];

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fmt = (n) => Number(n).toLocaleString('bg-BG');
  const price = (p) => fmt(p.price) + ' €' + (p.deal === 'rent' ? '/мес.' : '');

  async function api(url, opts = {}) {
    const res = await fetch(url, {
      credentials: 'same-origin',
      headers: opts.body ? { 'Content-Type': 'application/json' } : undefined,
      ...opts, body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok) { const e = new Error((data && data.error) || 'Грешка ' + res.status); e.status = res.status; throw e; }
    return data;
  }

  const VB = { TYPES, CITIES, esc, $, $$, fmt, price, api, user: null, favs: new Set() };
  window.VB = VB;

  // ---------- Лого ----------
  const LOGO = `<svg width="38" height="38" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1E6BFF"/><stop offset="1" stop-color="#0B1F3A"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#lg)" stroke="#ffffff2e"/><path d="M8 21 24 7.5 40 21" fill="none" stroke="#FF8A5B" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 26 17 40.5 24.5 26" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 26v14.5M30 26h4.8a3.9 3.9 0 0 1 0 7.8H30m0 0h5.6a3.5 3.5 0 0 1 0 6.7H30" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  VB.LOGO = LOGO;

  // ---------- Тост ----------
  let toastEl, toastT;
  VB.toast = (t) => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = t; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 3200);
  };

  // ---------- Съдържание от админ панела ----------
  const get = (o, path) => path.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
  const digits = (p) => String(p || '').replace(/[^+\d]/g, '');
  const imgOk = (u) => /^(https?:\/\/\S+|\/api\/image\?id=\d+)$/i.test(u || '');
  VB.site = window.VB_DEFAULTS || {};
  VB.imgOk = imgOk;

  const NAV = [['/', 'Продай имот'], ['/properties', 'Търси имот'], ['/new-construction', 'Ново строителство'], ['/mortgage', 'Ипотечен кредит'], ['/about', 'За нас'], ['/careers', 'Кариери']];
  function renderChrome() {
    const S = VB.site, c = S.contact || {}, t = S.topbar || {}, f = S.footer || {};
    const path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/(.)\/$/, '$1');
    const h = $('#site-header');
    if (h) h.innerHTML = `
      <a class="skip" href="#main">Към съдържанието</a>
      ${t.visible ? `<div class="topbar">${esc(t.text)} <a href="${esc(t.link)}">${esc(t.link_text)}</a></div>` : ''}
      <header class="header"><div class="header-in">
        <a class="logo" href="/" aria-label="VandBHome – начало">${LOGO}<span>VandB<b>Home</b></span></a>
        <nav id="nav" class="nav" aria-label="Основно меню">
          ${NAV.map(([href, n]) => `<a class="nl${path === href ? ' on' : ''}" href="${href}">${n}</a>`).join('')}
        </nav>
        <div class="nav-r">
          <a class="btn btn-sun btn-sm" href="/advert">Обяви имот</a>
          <span id="acc-slot"></span>
          <button class="burger" aria-label="Меню" aria-expanded="false" aria-controls="nav"><span></span><span></span></button>
        </div>
      </div></header>`;
    const social = [['Facebook', c.facebook], ['Instagram', c.instagram], ['YouTube', c.youtube]].filter(([, u]) => u).map(([n, u]) => `<a href="${esc(u)}" target="_blank" rel="noopener">${n}</a>`).join('');
    const ft = $('#site-footer');
    if (ft) ft.innerHTML = `
      <footer class="footer"><div class="wrap">
        <div class="foot">
          <div><a class="logo" href="/">${LOGO}<span>VandB<b>Home</b></span></a>
            <p>${esc(f.about)}</p><p>${esc(c.phone)}<br>${esc(c.email)}</p><p>${esc(c.hours)}</p>${social}</div>
          <div><h3>Услуги</h3><a href="/">Продай имот</a><a href="/properties">Търси имот</a><a href="/new-construction">Ново строителство</a><a href="/mortgage">Ипотечен кредит</a><a href="/advert">Обяви имот</a></div>
          <div><h3>Компания</h3><a href="/about">За нас</a><a href="/members">Екип</a><a href="/careers">Кариери</a><a href="/stipendii">Стипендии</a><a href="/blog">Блог</a><a href="/privacy">Защита на личните данни</a></div>
          <div><h3>Популярни търсения</h3>
            <a href="/nedvizhimi-imoti-sofia">Имоти в София</a><a href="/dvustayni-apartamenti-sofia">Двустайни в София</a><a href="/tristayni-apartamenti-sofia">Тристайни в София</a>
            <a href="/kashti-varna">Къщи във Варна</a><a href="/nedvizhimi-imoti-plovdiv">Имоти в Пловдив</a><a href="/apartamenti-pod-naem-sofia">Под наем в София</a></div>
        </div>
        <p class="legal">${esc(f.legal)}</p>
      </div></footer>
      <div class="fab" role="group" aria-label="Бърза връзка">
        <button type="button" class="fab-q" id="fab-q">Запитване</button>
        <a href="tel:${esc(digits(c.phone))}">Обади се</a>
        <a href="viber://chat?number=${encodeURIComponent(digits(c.phone))}">Пиши на Вайбър</a>
      </div>`;
    const fq = $('#fab-q'); if (fq) fq.onclick = openQuick;
    const burger = $('.burger'), nav = $('#nav');
    if (burger) burger.onclick = () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
    renderAccount();
  }

  // шаблони за списъците, които се редактират от админа
  const paras = (t) => String(t || '').split(/\n{2,}/).map((x) => `<p>${esc(x).replace(/\n/g, '<br>')}</p>`).join('');
  const ini = (n) => String(n || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
  const LISTS = {
    'home.checks': (t) => `<li>${esc(t)}</li>`,
    'home.offers': (o) => `<article class="offer${o.top ? ' top' : ''}"><span class="av">${esc(o.initials)}</span><div><h3>${esc(o.name)}</h3><p>предлага за твоя имот</p></div><strong>${esc(o.amount)}</strong>${o.top ? '<em>Най-висока</em>' : ''}</article>`,
    'home.how': (o, i) => `<div><b>${i + 1}</b><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p></div>`,
    'home.stats': (o) => `<div><dt>${esc(o.value)}</dt><dd>${esc(o.label)}</dd></div>`,
    'home.reviews': (o) => `<blockquote><div class="stars">★★★★★</div><p>${esc(o.text)}</p><footer>${esc(o.author)}</footer></blockquote>`,
    'home.faq': (o) => `<details><summary>${esc(o.q)}</summary><p>${esc(o.a)}</p></details>`,
    'about.stats': (o) => `<div><dt style="color:var(--teal)">${esc(o.value)}</dt><dd style="color:var(--mut)">${esc(o.label)}</dd></div>`,
    'about.values': (o) => `<div><h3>${esc(o.title)}</h3><p>${esc(o.text)}</p></div>`,
    'about.offices': (o) => `<div><h3>${esc(o.name)}</h3><p>${esc(o.address)}<br>${esc(o.phone)}</p></div>`,
    'team': (o) => `<div class="member" data-city="${esc(o.city)}">${imgOk(o.photo) ? `<img class="avimg" src="${esc(o.photo)}" alt="${esc(o.name)}" loading="lazy">` : `<span class="av">${esc(ini(o.name))}</span>`}<h3>${esc(o.name)}</h3><p>${esc(o.role)}</p><p>${esc(o.office || o.city)}</p></div>`,
    'jobs': (o) => `<div class="job"><div><h3>${esc(o.title)}</h3><p>${esc(o.meta)}</p></div><a class="btn btn-ghost btn-sm" href="#kandidatstvaj" data-pos="${esc(o.title)}">Кандидатствай</a></div>`,
  };
  VB.LISTS = LISTS;

  function shade(hex, f) { // f<0 – по-тъмно, f>0 – по-светло
    const n = parseInt(hex.slice(1), 16), ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f));
    return '#' + ch.map((v) => v.toString(16).padStart(2, '0')).join('');
  }

  function applySite(S) {
    VB.site = S;
    const th = S.theme || {}, root = document.documentElement.style;
    if (th.primary) { root.setProperty('--teal', th.primary); root.setProperty('--sea', shade(th.primary, .45)); }
    if (th.accent) { root.setProperty('--sun', th.accent); root.setProperty('--sun2', shade(th.accent, -.12)); }
    if (th.dark) { root.setProperty('--ink', th.dark); root.setProperty('--ink2', shade(th.dark, -.35)); }
    renderChrome();
    $$('[data-c]').forEach((el) => { const v = get(S, el.dataset.c); if (typeof v === 'string') { if (el.hasAttribute('data-paras')) el.innerHTML = paras(v); else el.textContent = v; } });
    $$('[data-show]').forEach((el) => { el.hidden = get(S, el.dataset.show) === false; });
    $$('[data-tel]').forEach((el) => { el.href = 'tel:' + digits(get(S, el.dataset.tel)); });
    $$('[data-mail]').forEach((el) => { el.href = 'mailto:' + get(S, el.dataset.mail); });
    $$('[data-list]').forEach((el) => {
      const key = el.dataset.list, list = get(S, key), tpl = LISTS[key];
      if (!Array.isArray(list) || !tpl) return;
      const lim = Number(el.dataset.limit) || list.length;
      el.innerHTML = list.slice(0, lim).map(tpl).join('');
    });
    const hero = $('[data-hero]');
    if (hero) {
      const img = get(S, 'home.hero_image');
      if (imgOk(img)) { hero.style.backgroundImage = `url("${img}")`; hero.classList.add('has-img'); }
      else { hero.style.backgroundImage = ''; hero.classList.remove('has-img'); }
    }
    $$('[data-pos]').forEach((b) => b.addEventListener('click', () => { const sel = $('#k-pos'); if (sel) sel.value = b.dataset.pos; }));
    const pos = $('#k-pos');
    if (pos && Array.isArray(S.jobs)) pos.innerHTML = S.jobs.map((j) => `<option>${esc(j.title)}</option>`).join('');
    document.dispatchEvent(new CustomEvent('vb:site', { detail: S }));
  }
  VB.applySite = applySite;

  function renderAccount() {
    const slot = $('#acc-slot');
    if (!slot) return;
    slot.innerHTML = VB.user
      ? `<a class="acc-btn" href="/account" title="Моят профил">♥ <span>Профил</span> <span class="cnt">${VB.favs.size}</span></a>`
      : `<button class="acc-btn" id="open-login">Вход</button>`;
    const b = $('#open-login');
    if (b) b.onclick = () => VB.openAuth('login');
  }

  // ---------- Вход / регистрация ----------
  let dlg;
  function buildDialog() {
    dlg = document.createElement('dialog');
    dlg.innerHTML = `
      <button class="dlg-x" aria-label="Затвори" type="button">×</button>
      <form id="auth-form" novalidate>
        <h2 id="auth-title" style="font-size:1.6rem"></h2>
        <p id="auth-lead" class="small" style="margin:0"></p>
        <label id="auth-name-l">Име (по желание)<input name="name" type="text" autocomplete="name"></label>
        <label>Имейл *<input name="email" type="email" autocomplete="email" required></label>
        <label>Парола *<input name="password" type="password" autocomplete="current-password" required></label>
        <p id="auth-req" class="small" style="margin:-6px 0 0">Минимум 8 символа и поне една цифра.</p>
        <label class="check" id="auth-consent"><input type="checkbox" name="consent"> <span>Съгласен съм с правилата за <a href="/privacy" target="_blank">защита на личните данни</a></span></label>
        <button class="btn" type="submit" id="auth-submit"></button>
        <p class="msg" id="auth-msg" role="alert" hidden></p>
        <p class="dlg-sw" id="auth-sw"></p>
      </form>`;
    document.body.appendChild(dlg);
    $('.dlg-x', dlg).onclick = () => dlg.close();
    dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
    $('#auth-form').onsubmit = submitAuth;
  }
  let mode = 'login';
  VB.openAuth = (m, reason) => {
    if (!dlg) buildDialog();
    mode = m || 'login';
    const reg = mode === 'register';
    $('#auth-title').textContent = reg ? 'Създай профил' : 'Влез в профила си';
    $('#auth-lead').textContent = reason || (reg ? 'Запазвай имоти и следи промените в цените им.' : 'За да запазваш имоти и да следиш цените им, влез с имейла си.');
    $('#auth-name-l').hidden = !reg; $('#auth-req').hidden = !reg; $('#auth-consent').hidden = !reg;
    $('#auth-form').elements.password.autocomplete = reg ? 'new-password' : 'current-password';
    $('#auth-submit').textContent = reg ? 'Създай профил' : 'Вход';
    $('#auth-sw').innerHTML = reg ? 'Вече имаш профил? <button type="button" data-sw="login">Влез</button>' : 'Нямаш профил? <button type="button" data-sw="register">Регистрирай се</button>';
    $('#auth-sw button').onclick = (e) => VB.openAuth(e.target.dataset.sw);
    $('#auth-msg').hidden = true;
    if (!dlg.open) dlg.showModal();
  };
  async function submitAuth(e) {
    e.preventDefault();
    const f = e.target, msg = $('#auth-msg'), btn = $('#auth-submit');
    msg.hidden = true;
    const el = f.elements;
    const body = { action: mode, email: el.email.value.trim(), password: el.password.value, name: el.name.value.trim(), consent: el.consent.checked };
    btn.disabled = true;
    try {
      const d = await api('/api/account', { method: 'POST', body });
      VB.user = d.user; VB.favs = new Set(d.favorites || []);
      f.reset(); dlg.close(); renderAccount(); refreshHearts();
      VB.toast(mode === 'register' ? 'Профилът е създаден.' : 'Добре дошъл отново!');
      document.dispatchEvent(new CustomEvent('vb:auth'));
    } catch (err) { msg.textContent = err.message; msg.hidden = false; }
    finally { btn.disabled = false; }
  }
  VB.logout = async () => {
    try { await api('/api/account', { method: 'POST', body: { action: 'logout' } }); } catch (_) {}
    VB.user = null; VB.favs = new Set(); renderAccount(); refreshHearts();
    document.dispatchEvent(new CustomEvent('vb:auth'));
  };

  // ---------- Любими ----------
  function refreshHearts() {
    $$('.fav-btn').forEach((b) => {
      const on = VB.favs.has(Number(b.dataset.fav));
      b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      b.title = on ? 'Премахни от любими' : 'Запази в любими';
    });
    const c = $('.acc-btn .cnt'); if (c) c.textContent = VB.favs.size;
  }
  VB.refreshHearts = refreshHearts;
  VB.toggleFav = async (id) => {
    if (!VB.user) { VB.openAuth('login', 'Влез или създай профил, за да запазиш имота и да следиш цената му.'); return; }
    try {
      const d = await api('/api/favorites', { method: 'POST', body: { property_id: id } });
      d.favorite ? VB.favs.add(id) : VB.favs.delete(id);
      refreshHearts();
      VB.toast(d.favorite ? 'Запазено в любими. Ще следим цената.' : 'Премахнато от любими.');
      document.dispatchEvent(new CustomEvent('vb:fav', { detail: { id, favorite: d.favorite } }));
    } catch (err) { if (err.status === 401) { VB.user = null; renderAccount(); VB.openAuth('login'); } else VB.toast(err.message); }
  };
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.fav-btn');
    if (b) { e.preventDefault(); VB.toggleFav(Number(b.dataset.fav)); }
  });

  // ---------- Карта на имот ----------
  const SCENES = [['#8EC5FF', '#EAF4FF'], ['#FFC3A0', '#FFF0E6'], ['#B8B5FF', '#EEEDFF'], ['#9AD1F5', '#E6F6FF'], ['#FFD59A', '#FFF4DF'], ['#A5B4FC', '#EEF0FF'], ['#FFB4C2', '#FFF0F3'], ['#9BC4FF', '#EAF2FF']];
  const pal = (id) => SCENES[Math.abs(Number(id)) % SCENES.length];
  // Илюстрация по подразбиране (когато имотът няма снимка)
  VB.placeholder = (id) => {
    const n = Math.abs(Number(id)) || 1, h1 = 60 + (n * 17) % 50, h2 = 80 + (n * 29) % 55, h3 = 50 + (n * 11) % 45;
    return `<svg viewBox="0 0 300 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="${70 + (n * 37) % 160}" cy="46" r="20" fill="#fff" opacity=".75"/>
      <path d="M0 150c60-18 120-18 180 0s90 6 120-6v46H0z" fill="#fff" opacity=".35"/>
      <rect x="46" y="${150 - h1}" width="62" height="${h1}" rx="6" fill="#fff" opacity=".85"/>
      <rect x="116" y="${150 - h2}" width="74" height="${h2}" rx="6" fill="#0B1F3A" opacity=".82"/>
      <rect x="198" y="${150 - h3}" width="56" height="${h3}" rx="6" fill="#fff" opacity=".7"/>
      ${[0, 1, 2].map((r) => [0, 1].map((k) => `<rect x="${126 + k * 28}" y="${150 - h2 + 12 + r * 20}" width="14" height="10" rx="2" fill="#FF8A5B" opacity=".9"/>`).join('')).join('')}
      <path d="M0 150h300v40H0z" fill="#0B1F3A" opacity=".16"/></svg>`;
  };
  VB.pal = pal;
  const isUrl = (u) => imgOk(u);

  VB.card = (p, opts = {}) => {
    const [c1, c2] = pal(p.id);
    const img = isUrl(p.image_url) ? `<img src="${esc(p.image_url)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    const facts = [p.area > 0 ? `${fmt(p.area)} м²` : '', p.floor ? (/^\d+$/.test(p.floor) ? `${esc(p.floor)} ет.` : esc(p.floor)) : '', p.bedrooms > 0 ? `${p.bedrooms} спал.` : '', p.construction ? esc(p.construction) : '']
      .filter(Boolean).map((t) => `<span>${t}</span>`).join('');
    const loc = [p.district, p.city].filter(Boolean).map(esc).join(', ');
    const chip = opts.extra || '';
    return `<article class="prop">
      <a class="pic" href="/property?id=${p.id}" style="--c1:${c1};--c2:${c2}" aria-label="${esc(p.title)}">${VB.placeholder(p.id)}${img}
        <span class="tags"><span class="tag${p.deal === 'rent' ? ' sun' : ''}">${p.deal === 'rent' ? 'Наем' : 'Продажба'}</span>${p.badge ? `<span class="tag badge">${esc(p.badge)}</span>` : ''}${p.new_construction ? '<span class="tag new">Ново строителство</span>' : ''}</span></a>
      <button class="fav-btn" data-fav="${p.id}" aria-label="Запази в любими" aria-pressed="false"><svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 2.7 5 6 5c2 0 3.4 1.1 4 2.2h4C14.6 6.1 16 5 18 5c3.3 0 5.1 3.4 3.6 6.8C19.5 16.4 12 21 12 21z" stroke-linejoin="round"/></svg></button>
      <div class="b"><span class="loc">${loc} · ${esc(p.code)}</span>
        <h3><a href="/property?id=${p.id}">${esc(p.title)}</a></h3>
        <div class="facts">${facts || `<span>${esc(p.details)}</span>`}</div>${chip}
        <div class="price">${price(p)}${p.ppsqm && p.deal !== 'rent' ? ` <small>· ${fmt(p.ppsqm)} €/м²</small>` : ''}</div></div></article>`;
  };

  // ---------- Формуляри за запитвания ----------
  VB.sendLead = async (form, kind, extra = {}) => {
    const msg = $('.msg', form);
    const val = (n) => (form.elements[n] ? form.elements[n].value.trim() : '');
    const body = { kind, name: val('name'), phone: val('phone'), email: val('email'), type: val('type'), city: val('city'), message: val('message'), website: val('website'), consent: !!(form.elements.consent && form.elements.consent.checked), ...extra };
    let bad = false;
    $$('.invalid', form).forEach((x) => x.classList.remove('invalid'));
    const mark = (n) => { if (form.elements[n]) form.elements[n].classList.add('invalid'); bad = true; };
    if (body.name.length < 2) mark('name');
    if (!/^[+0-9()\s-]{6,20}$/.test(body.phone)) mark('phone');
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(body.email)) mark('email');
    if (!body.consent) { if (form.elements.consent) form.elements.consent.classList.add('invalid'); bad = true; }
    if (bad) { msg.textContent = 'Моля, попълни правилно отбелязаните полета.'; msg.className = 'msg'; msg.hidden = false; return false; }
    const btn = $('button[type=submit]', form); if (btn) btn.disabled = true;
    try {
      await api('/api/leads', { method: 'POST', body });
      msg.textContent = 'Благодарим! Консултант ще се свърже с теб до края на работния ден.'; msg.className = 'msg ok'; msg.hidden = false;
      form.reset();
      return true;
    } catch (err) { msg.textContent = err.message; msg.className = 'msg'; msg.hidden = false; return false; }
    finally { if (btn) btn.disabled = false; }
  };

  VB.consentHtml = '<label class="check"><input type="checkbox" name="consent"> <span>Съгласен съм с правилата за <a href="/privacy" target="_blank">защита на личните данни</a></span></label>';
  VB.hpHtml = '<input class="hp" type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">';

  // ---------- Бързо запитване ----------
  let qdlg;
  function openQuick() {
    if (!qdlg) {
      qdlg = document.createElement('dialog');
      qdlg.innerHTML = `<button class="dlg-x" aria-label="Затвори" type="button">×</button>
        <form id="quick-form" novalidate><h2 style="font-size:1.5rem">Бързо запитване</h2>
        <p class="small" style="margin:0">Остави данните си и брокер ще ти се обади в рамките на работния ден.</p>
        <label>Име<input name="name" type="text" autocomplete="name"></label>
        <label>Телефон<input name="phone" type="tel" autocomplete="tel" placeholder="+359 …"></label>
        <label>Съобщение (по желание)<textarea name="message" maxlength="500"></textarea></label>
        ${VB.consentHtml}${VB.hpHtml}
        <button class="btn btn-sun" type="submit">Изпрати</button><p class="msg" role="status" hidden></p></form>`;
      document.body.appendChild(qdlg);
      $('.dlg-x', qdlg).onclick = () => qdlg.close();
      qdlg.addEventListener('click', (e) => { if (e.target === qdlg) qdlg.close(); });
      $('#quick-form').onsubmit = async (e) => { e.preventDefault(); const ok = await VB.sendLead(e.target, 'contact'); if (ok) setTimeout(() => qdlg.close(), 1800); };
    }
    $('#quick-form .msg').hidden = true;
    qdlg.showModal();
  }

  // ---------- Старт ----------
  applySite(VB.site);
  VB.siteReady = api('/api/site').then((S) => { applySite(S); return S; }).catch(() => VB.site);
  VB.ready = (async () => {
    try {
      const d = await api('/api/account');
      VB.user = d.user; VB.favs = new Set(d.favorites || []);
    } catch (_) {}
    renderAccount(); refreshHearts();
  })();
})();
