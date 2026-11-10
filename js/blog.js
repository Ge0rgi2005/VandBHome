(function () {
  const { $, api, esc } = VB;
  const isUrl = (u) => /^https?:\/\//i.test(u || '');
  const fdate = (s) => new Date(s).toLocaleDateString('bg-BG', { day: 'numeric', month: 'long', year: 'numeric' });

  const list = $('#posts');
  if (list) {
    api('/api/posts').then((d) => {
      list.innerHTML = d.length ? d.map((p, i) => {
        const [c1, c2] = VB.pal(p.id + 1);
        const img = isUrl(p.cover_url) ? `<img src="${esc(p.cover_url)}" alt="" loading="lazy" onerror="this.remove()">` : '';
        return `<article class="prop"><a class="pic" href="/post?slug=${encodeURIComponent(p.slug)}" style="--c1:${c1};--c2:${c2};height:150px" aria-label="${esc(p.title)}">${VB.placeholder(p.id + 1)}${img}</a>
          <div class="b"><span class="loc">${fdate(p.created_at)}</span><h3><a href="/post?slug=${encodeURIComponent(p.slug)}">${esc(p.title)}</a></h3>
          <div class="facts"><span>${esc(p.excerpt)}</span></div><a class="more" style="font-weight:700;color:var(--teal);text-decoration:none;margin-top:auto" href="/post?slug=${encodeURIComponent(p.slug)}">Прочети →</a></div></article>`;
      }).join('') : '<p class="empty">Все още няма публикувани статии.</p>';
    }).catch(() => { list.innerHTML = '<p class="empty">Статиите не могат да бъдат заредени в момента.</p>'; });
  }

  const box = $('#post');
  if (box) {
    const slug = new URLSearchParams(location.search).get('slug') || '';
    api('/api/posts?slug=' + encodeURIComponent(slug)).then((p) => {
      document.title = `${p.title} | VandBHome`;
      $('#crumb').textContent = p.title;
      const paras = String(p.body).split(/\n{2,}/).map((t) => `<p>${esc(t).replace(/\n/g, '<br>')}</p>`).join('');
      box.innerHTML = `<p class="small" style="margin:0 0 8px">${fdate(p.created_at)}</p><h1 style="font-size:clamp(1.9rem,4vw,2.8rem);margin-bottom:20px">${esc(p.title)}</h1>
        ${isUrl(p.cover_url) ? `<img src="${esc(p.cover_url)}" alt="" style="width:100%;border-radius:var(--r);margin-bottom:20px">` : ''}
        ${p.excerpt ? `<p style="font-size:1.2rem;font-weight:600;color:var(--mut)">${esc(p.excerpt)}</p>` : ''}${paras}
        <div class="contact-strip"><div><h3>Имаш въпрос към брокер?</h3></div><a class="btn" href="/advert#kontakt">Свържи се с нас</a></div>`;
    }).catch(() => { box.innerHTML = '<div class="empty"><h2 style="font-size:1.6rem">Статията не е намерена</h2><a class="btn" href="/blog">Към блога</a></div>'; $('#crumb').textContent = '—'; });
  }
})();
