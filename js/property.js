(function () {
  const { $, $$, api, esc, fmt } = VB;
  const id = Number(new URLSearchParams(location.search).get('id'));
  const root = $('#detail');
  const isUrl = (u) => /^https?:\/\//i.test(u || '');

  async function init() {
    if (!Number.isInteger(id) || id <= 0) return fail();
    let p;
    try { p = await api('/api/properties?id=' + id); } catch (e) { return fail(e.status === 404); }
    render(p);
    await VB.ready; VB.refreshHearts();
    similar(p);
  }
  function fail(nf) {
    root.innerHTML = `<div class="empty"><h2 style="font-size:1.6rem">${nf === false ? 'Имотът не може да бъде зареден' : 'Имотът не е намерен'}</h2><p>Възможно е обявата да е свалена.</p><a class="btn" href="/properties">Към всички оферти</a></div>`;
    $('#crumb').textContent = '—';
  }

  function render(p) {
    document.title = `${p.title} | VandBHome`;
    $('#crumb').textContent = p.title;
    const [c1, c2] = VB.pal(p.id);
    const imgs = [p.image_url, ...p.images].filter(isUrl);
    const spec = [
      ['Код на обявата', p.code], ['Вид сделка', p.deal === 'rent' ? 'Наем' : 'Продажба'], ['Тип', p.type],
      ['Град', p.city], p.district && ['Квартал', p.district], p.area > 0 && ['Квадратура', fmt(p.area) + ' м²'],
      p.floor && ['Етаж', p.floor], p.bedrooms > 0 && ['Брой спални', p.bedrooms], p.construction && ['Строителство', p.construction],
      ['Обзаведен', p.furnished ? 'Да' : 'Не'], p.ppsqm && p.deal !== 'rent' && ['Цена на м²', fmt(p.ppsqm) + ' €'],
      p.new_construction && ['Ново строителство', 'Да'], ['Публикувана', new Date(p.created_at).toLocaleDateString('bg-BG')],
    ].filter(Boolean);
    const loanLink = p.deal === 'sale' ? `<a class="calc-link" href="/mortgage?price=${p.price}"><b>Изчисли ипотечна вноска →</b><span>Виж ориентировъчна месечна вноска за този имот.</span></a>` : '';

    root.innerHTML = `
    <div class="detail">
      <div>
        <div class="gallery"><div class="main" id="g-main" style="--c1:${c1};--c2:${c2}">${VB.placeholder(p.id)}${imgs[0] ? `<img src="${esc(imgs[0])}" alt="${esc(p.title)}" onerror="this.remove()">` : ''}</div>
          ${imgs.length > 1 ? `<div class="thumbs">${imgs.map((u, i) => `<button type="button" class="${i ? '' : 'on'}" data-i="${i}" aria-label="Снимка ${i + 1}"><img src="${esc(u)}" alt="" loading="lazy"></button>`).join('')}</div>` : ''}</div>
        <div class="d-head"><div><span class="tag${p.deal === 'rent' ? ' sun' : ''}">${p.deal === 'rent' ? 'Наем' : 'Продажба'}</span>
          <h1 style="font-size:clamp(1.7rem,3.4vw,2.4rem);margin-top:10px">${esc(p.title)}</h1>
          <p class="small" style="margin:6px 0 0">${[p.district, p.city].filter(Boolean).map(esc).join(', ')} · ${esc(p.code)}</p></div>
          <div class="d-price">${VB.price(p)}${p.ppsqm && p.deal !== 'rent' ? `<small>${fmt(p.ppsqm)} €/м²</small>` : ''}</div></div>
        <h2 style="font-size:1.4rem;margin:26px 0 12px">Характеристики</h2>
        <dl class="spec">${spec.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        ${(p.description || p.details) ? `<h2 style="font-size:1.4rem;margin:30px 0 12px">Описание</h2><p class="desc">${esc(p.description || p.details)}</p>` : ''}
      </div>
      <aside class="side">
        <form class="form-card" id="p-form" novalidate>
          <h2 style="font-size:1.35rem">Запитване за този имот</h2>
          <label>Име<input name="name" type="text" autocomplete="name"></label>
          <label>Телефон<input name="phone" type="tel" autocomplete="tel" placeholder="+359 …"></label>
          <label>Съобщение<textarea name="message">Здравейте, интересувам се от имот ${esc(p.code)}. Моля, свържете се с мен.</textarea></label>
          ${VB.consentHtml}${VB.hpHtml}
          <button class="btn btn-sun" type="submit">Изпрати запитване</button>
          <p class="msg" role="status" hidden></p>
        </form>
        <div class="share">
          <button class="btn btn-ghost btn-sm fav-btn-big" id="d-fav" type="button">♥ Запази и следи цената</button>
          <button class="btn btn-ghost btn-sm" id="d-copy" type="button">Копирай връзката</button>
        </div>
        ${loanLink}
      </aside>
    </div>`;

    $$('.thumbs button').forEach((b) => (b.onclick = () => {
      $$('.thumbs button').forEach((x) => x.classList.toggle('on', x === b));
      let im = $('#g-main img'); if (!im) { im = document.createElement('img'); $('#g-main').appendChild(im); }
      im.src = imgs[Number(b.dataset.i)];
    }));
    $('#p-form').onsubmit = (e) => { e.preventDefault(); VB.sendLead(e.target, 'property', { property_id: p.id }); };
    const fav = $('#d-fav');
    const sync = () => { const on = VB.favs.has(p.id); fav.textContent = on ? '♥ Запазен – премахни' : '♥ Запази и следи цената'; };
    fav.onclick = () => VB.toggleFav(p.id);
    document.addEventListener('vb:fav', sync); document.addEventListener('vb:auth', sync); VB.ready.then(sync);
    $('#d-copy').onclick = async () => {
      try { await navigator.clipboard.writeText(location.href); VB.toast('Връзката е копирана.'); } catch (_) { VB.toast(location.href); }
    };
  }

  async function similar(p) {
    try {
      const d = await api(`/api/properties?city=${encodeURIComponent(p.city)}&deal=${p.deal}&pageSize=5`);
      const list = d.items.filter((x) => x.id !== p.id).slice(0, 3);
      if (!list.length) return;
      $('#similar').innerHTML = list.map((x) => VB.card(x)).join('');
      $('#similar-wrap').hidden = false; VB.refreshHearts();
    } catch (_) {}
  }
  init();
})();
