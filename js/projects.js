(function () {
  const { $, api, esc, fmt } = VB;
  const isUrl = (u) => /^https?:\/\//i.test(u || '');

  function projectCard(p) {
    const [c1, c2] = VB.pal(p.id + 3);
    const img = isUrl(p.image_url) ? `<img src="${esc(p.image_url)}" alt="" loading="lazy" onerror="this.remove()">` : '';
    const range = p.min_price ? (p.min_price === p.max_price ? `${fmt(p.min_price)} €` : `${fmt(p.min_price)} – ${fmt(p.max_price)} €`) : 'Цени при запитване';
    return `<article class="prop">
      <a class="pic" href="/project?id=${p.id}" style="--c1:${c1};--c2:${c2}" aria-label="${esc(p.name)}">${VB.placeholder(p.id + 3)}${img}
        <span class="tags">${p.stage ? `<span class="tag sun">${esc(p.stage)}</span>` : ''}<span class="tag">${p.free || 0} свободни</span></span></a>
      <div class="b"><span class="loc">${[p.district, p.city].filter(Boolean).map(esc).join(', ')}</span>
        <h3><a href="/project?id=${p.id}">${esc(p.name)}</a></h3>
        <div class="facts"><span>${esc(p.tagline || '')}</span></div>
        <div class="price" style="font-size:1.15rem">${range}</div></div></article>`;
  }

  // ----- Списък с проекти (страница „Ново строителство“) -----
  const list = $('#projects');
  if (list) {
    api('/api/projects').then((d) => {
      list.innerHTML = d.length ? d.map(projectCard).join('') : '<p class="empty">Все още няма публикувани проекти.</p>';
    }).catch(() => { list.innerHTML = '<p class="empty">Проектите не могат да бъдат заредени в момента.</p>'; });
  }

  // ----- Страница на проект -----
  const head = $('#pr-head');
  if (head) {
    const id = Number(new URLSearchParams(location.search).get('id'));
    const fail = () => { head.innerHTML = '<div class="empty"><h2 style="font-size:1.6rem">Проектът не е намерен</h2><a class="btn" href="/new-construction">Към всички проекти</a></div>'; $('#crumb').textContent = '—'; };
    if (!Number.isInteger(id) || id <= 0) { fail(); return; }
    (async () => {
      let p;
      try { p = await api('/api/projects?id=' + id); } catch (_) { return fail(); }
      document.title = `${p.name} | VandBHome`;
      $('#crumb').textContent = p.name;
      const [c1, c2] = VB.pal(p.id + 3);
      const range = p.min_price ? (p.min_price === p.max_price ? `${fmt(p.min_price)} €` : `от ${fmt(p.min_price)} до ${fmt(p.max_price)} €`) : 'Цени при запитване';
      head.innerHTML = `
        <div class="gallery"><div class="main" style="--c1:${c1};--c2:${c2};height:320px">${VB.placeholder(p.id + 3)}${isUrl(p.image_url) ? `<img src="${esc(p.image_url)}" alt="${esc(p.name)}" onerror="this.remove()">` : ''}</div></div>
        <div class="d-head"><div>${p.stage ? `<span class="tag sun">${esc(p.stage)}</span>` : ''}
          <h1 style="font-size:clamp(1.8rem,3.6vw,2.6rem);margin-top:10px">${esc(p.name)}</h1>
          <p class="small" style="margin:6px 0 0">${[p.district, p.city].filter(Boolean).map(esc).join(', ')}</p></div>
          <div class="d-price">${range}<small>${p.free || 0} свободни жилища</small></div></div>
        ${p.tagline ? `<p style="font-size:1.15rem;font-weight:600;margin:0 0 10px">${esc(p.tagline)}</p>` : ''}
        ${p.description ? `<p class="desc">${esc(p.description)}</p>` : ''}`;
      $('#pr-form').elements.message.value = `Интересувам се от проект „${p.name}“. Моля, свържете се с мен.`;
      $('#pr-form').onsubmit = (e) => { e.preventDefault(); VB.sendLead(e.target, 'project'); };
      try {
        const d = await api(`/api/properties?project=${id}&pageSize=48`);
        $('#grid').innerHTML = d.items.length ? d.items.map((x) => VB.card(x)).join('') : '<p class="empty">В момента няма свободни жилища в този проект.</p>';
        await VB.ready; VB.refreshHearts();
      } catch (_) { $('#grid').innerHTML = '<p class="empty">Жилищата не могат да бъдат заредени.</p>'; }
    })();
  }
})();
