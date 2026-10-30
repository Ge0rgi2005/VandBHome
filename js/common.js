/* VandBHome – общ код: хедър, футър, вход/регистрация, любими, карти, формуляри */
(function () {
  const TYPES = ['1-стаен','2-стаен','3-стаен','4-стаен','Многостаен','Мезонет','Къща','Вила','Етаж от къща','Офис','Магазин','Заведение','Склад','Парцел','Гараж'];
  const CITIES = ['София','Пловдив','Варна','Бургас','Русе'];
  const PALETTE = [['#0B2F36','#5FA8A0'],['#0F5560','#F5B841'],['#071F24','#5FA8A0'],['#2B6B6A','#EEF4F3'],['#0B2F36','#F5B841'],['#1F5A62','#9ED0C9'],['#071F24','#F5B841'],['#0F5560','#EEF4F3']];

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
  const LOGO = `<svg width="38" height="38" viewBox="0 0 48 48" aria-hidden="true"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0F5560"/><stop offset="1" stop-color="#0B2F36"/></linearGradient></defs><rect width="48" height="48" rx="13" fill="url(#lg)" stroke="#ffffff2e"/><path d="M8 21 24 7.5 40 21" fill="none" stroke="#F5B841" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M9.5 26 17 40.5 24.5 26" fill="none" stroke="#fff" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M30 26v14.5M30 26h4.8a3.9 3.9 0 0 1 0 7.8H30m0 0h5.6a3.5 3.5 0 0 1 0 6.7H30" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  VB.LOGO = LOGO;

  // ---------- Тост ----------
  let toastEl, toastT;
  VB.toast = (t) => {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = t; toastEl.classList.add('show');
    clearTimeout(toastT); toastT = setTimeout(() => toastEl.classList.remove('show'), 3200);
  };

  // ---------- Хедър / футър ----------
  const NAV = [['/', 'Продай имот'], ['/properties', 'Търси имот'], ['/new-construction', 'Ново строителство'], ['/mortgage', 'Ипотечен кредит'], ['/about', 'За нас'], ['/careers', 'Кариери']];
  function renderChrome() {
    const path = location.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/(.)\/$/, '$1');
    const h = $('#site-header');
    if (h) h.innerHTML = `
      <a class="skip" href="#main">Към съдържанието</a>
      <div class="topbar">Търсим 50 нови брокери – стартирай кариерата си във VandBHome <a href="/careers">Виж позициите →</a></div>
      <header class="header"><div class="header-in">
        <a class="logo" href="/" aria-label="VandBHome – начало">${LOGO}<span>VandB<b>Home</b></span></a>
        <nav id="nav" class="nav" aria-label="Основно меню">
          ${NAV.map(([href, t]) => `<a class="nl${path === href ? ' on' : ''}" href="${href}">${t}</a>`).join('')}
        </nav>
        <div class="nav-r">
          <a class="btn btn-sun btn-sm" href="/advert">Обяви имот</a>
          <span id="acc-slot"></span>
          <button class="burger" aria-label="Меню" aria-expanded="false" aria-controls="nav"><span></span><span></span></button>
        </div>
      </div></header>`;
    const f = $('#site-footer');
    if (f) f.innerHTML = `
      <footer class="footer"><div class="wrap">
        <div class="foot">
          <div><a class="logo" href="/">${LOGO}<span>VandB<b>Home</b></span></a>
            <p>+359 888 000 111<br>office@vandbhome.example</p><p>Пн–Пт 9:00–18:00</p></div>
          <div><h3>Услуги</h3><a href="/">Продай имот</a><a href="/properties">Търси имот</a><a href="/new-construction">Ново строителство</a><a href="/mortgage">Ипотечен кредит</a><a href="/advert">Обяви имот</a></div>
          <div><h3>Компания</h3><a href="/about">За нас</a><a href="/about#ekip">Екип</a><a href="/careers">Кариери</a><a href="/privacy">Защита на личните данни</a></div>
          <div><h3>Популярни търсения</h3>
            <a href="/properties?city=София&type=2-стаен">Двустайни в София</a><a href="/properties?city=Варна&type=Къща">Къщи във Варна</a>
            <a href="/properties?city=Пловдив">Имоти в Пловдив</a><a href="/properties?deal=rent">Имоти под наем</a></div>
        </div>
        <p class="legal">© 2026 VandBHome. Измислена фирма – демонстрационен проект. Всички имена, цени, отзиви и обяви са примерни. Не се извършват реални сделки.</p>
      </div></footer>
      <a class="callbar" href="tel:+359888000111">Обади се на брокер</a>`;

    const burger = $('.burger'), nav = $('#nav');
    if (burger) burger.onclick = () => { const o = nav.classList.toggle('open'); burger.setAttribute('aria-expanded', o); };
  }

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
  const HOUSE = (c) => `<svg viewBox="0 0 300 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><path d="M0 130h300v50H0z" fill="#00000026"/><path d="M95 130V86l55-38 55 38v44z" fill="#ffffff2e"/><path d="M85 90l65-47 65 47" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".85"/><rect x="132" y="98" width="36" height="32" rx="3" fill="#ffffff40"/><rect x="104" y="96" width="18" height="18" rx="2" fill="#ffffff40"/><rect x="178" y="96" width="18" height="18" rx="2" fill="#ffffff40"/></svg>`;
  const pal = (id) => PALETTE[Math.abs(Number(id)) % PALETTE.length];
  VB.placeholder = (id) => HOUSE(pal(id)[1] === '#EEF4F3' ? '#fff' : pal(id)[1]);
  VB.pal = pal;
  const isUrl = (u) => /^https?:\/\//i.test(u || '');

  VB.card = (p, opts = {}) => {
    const [c1, c2] = pal(p.id);
    const img = isUrl(p.image_url) ? `<img src="${esc(p.image_url)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    const facts = [p.area > 0 ? `${fmt(p.area)} м²` : '', p.floor ? (/^\d+$/.test(p.floor) ? `${esc(p.floor)} ет.` : esc(p.floor)) : '', p.bedrooms > 0 ? `${p.bedrooms} спал.` : '', p.construction ? esc(p.construction) : '']
      .filter(Boolean).map((t) => `<span>${t}</span>`).join('');
    const loc = [p.district, p.city].filter(Boolean).map(esc).join(', ');
    const chip = opts.extra || '';
    return `<article class="prop">
      <a class="pic" href="/property?id=${p.id}" style="--c1:${c1};--c2:${c2}" aria-label="${esc(p.title)}">${VB.placeholder(p.id)}${img}
        <span class="tags"><span class="tag${p.deal === 'rent' ? ' sun' : ''}">${p.deal === 'rent' ? 'Наем' : 'Продажба'}</span>${p.new_construction ? '<span class="tag new">Ново строителство</span>' : ''}</span></a>
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

  // ---------- Старт ----------
  renderChrome();
  VB.ready = (async () => {
    try {
      const d = await api('/api/account');
      VB.user = d.user; VB.favs = new Set(d.favorites || []);
    } catch (_) {}
    renderAccount(); refreshHearts();
  })();
  renderAccount();
})();
