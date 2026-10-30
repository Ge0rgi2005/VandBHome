(function () {
  const { $, $$, api, esc } = VB;
  const NEWC = !!window.VB_NEWC;
  const form = $('#filters');
  const KEYS = ['city', 'type', 'minArea', 'maxArea', 'minPrice', 'maxPrice', 'code'];
  const st = { deal: 'sale', sort: 'new', page: 1 };

  function readUrl() {
    const q = new URLSearchParams(location.search);
    st.deal = q.get('deal') === 'rent' ? 'rent' : 'sale';
    st.sort = ['new', 'price_asc', 'price_desc', 'sqm'].includes(q.get('sort')) ? q.get('sort') : 'new';
    st.page = Math.max(parseInt(q.get('page'), 10) || 1, 1);
    KEYS.forEach((k) => { if (form.elements[k]) form.elements[k].value = q.get(k) || ''; });
    $('#f-sort').value = st.sort;
    $$('#deal-tabs button').forEach((b) => b.classList.toggle('on', b.dataset.deal === st.deal));
  }
  function params() {
    const p = new URLSearchParams();
    if (st.deal === 'rent') p.set('deal', 'rent');
    KEYS.forEach((k) => { const v = form.elements[k] && form.elements[k].value.trim(); if (v) p.set(k, v); });
    if (st.sort !== 'new') p.set('sort', st.sort);
    if (st.page > 1) p.set('page', st.page);
    return p;
  }

  async function load() {
    const p = params();
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
    const api_p = new URLSearchParams(p);
    api_p.set('deal', st.deal); api_p.set('pageSize', '12');
    if (NEWC) api_p.set('newc', '1');
    $('#count').textContent = 'Зареждане…';
    try {
      const d = await api('/api/properties?' + api_p);
      $('#count').textContent = d.total ? `${VB.fmt(d.total)} ${d.total === 1 ? 'оферта' : 'оферти'}` : 'Няма намерени оферти';
      $('#grid').innerHTML = d.items.length ? d.items.map((x) => VB.card(x)).join('') : '<p class="empty">Няма имоти по тези критерии. Опитай с по-малко филтри.</p>';
      pager(d.page, d.pages);
      await VB.ready; VB.refreshHearts();
    } catch (e) {
      $('#count').textContent = '';
      $('#grid').innerHTML = '<p class="empty">Офертите не могат да бъдат заредени в момента.</p>';
      $('#pager').innerHTML = '';
    }
  }

  function pager(page, pages) {
    const el = $('#pager');
    if (pages <= 1) { el.innerHTML = ''; return; }
    const set = new Set([1, pages, page, page - 1, page + 1, page - 2, page + 2].filter((n) => n >= 1 && n <= pages));
    const nums = [...set].sort((a, b) => a - b);
    let html = `<button data-p="${page - 1}" ${page === 1 ? 'disabled' : ''} aria-label="Предишна">‹</button>`;
    nums.forEach((n, i) => {
      if (i && n - nums[i - 1] > 1) html += '<button disabled>…</button>';
      html += `<button data-p="${n}" class="${n === page ? 'on' : ''}" ${n === page ? 'aria-current="page"' : ''}>${n}</button>`;
    });
    html += `<button data-p="${page + 1}" ${page === pages ? 'disabled' : ''} aria-label="Следваща">›</button>`;
    el.innerHTML = html;
  }
  $('#pager').onclick = (e) => {
    const b = e.target.closest('button[data-p]');
    if (!b || b.disabled) return;
    st.page = Number(b.dataset.p); load();
    $('#grid').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  $$('#deal-tabs button').forEach((b) => (b.onclick = () => {
    st.deal = b.dataset.deal; st.page = 1;
    $$('#deal-tabs button').forEach((x) => x.classList.toggle('on', x === b)); load();
  }));
  form.onsubmit = (e) => { e.preventDefault(); st.page = 1; load(); };
  $('#f-clear').onclick = () => { form.reset(); st.page = 1; st.sort = 'new'; $('#f-sort').value = 'new'; load(); };
  $('#f-sort').onchange = (e) => { st.sort = e.target.value; st.page = 1; load(); };

  async function facets() {
    try {
      const d = await api('/api/properties?facets=1');
      const cur = { city: new URLSearchParams(location.search).get('city') || '', type: new URLSearchParams(location.search).get('type') || '' };
      $('#f-city').innerHTML = '<option value="">Всички градове</option>' + d.cities.map((c) => `<option>${esc(c.name)}</option>`).join('');
      $('#f-type').innerHTML = '<option value="">Всички типове</option>' + d.types.map((c) => `<option>${esc(c.name)}</option>`).join('');
      $('#f-city').value = cur.city; $('#f-type').value = cur.type;
    } catch (_) {}
  }

  facets().then(() => { readUrl(); load(); });
})();
