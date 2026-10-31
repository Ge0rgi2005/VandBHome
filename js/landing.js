(function () {
  const { $, api } = VB;
  const c = window.VB_LANDING;
  const q = new URLSearchParams({ city: c.city, deal: c.deal, pageSize: '12', sort: 'new' });
  if (c.type) q.set('type', c.type);
  const more = new URLSearchParams({ city: c.city });
  if (c.type) more.set('type', c.type);
  if (c.deal === 'rent') more.set('deal', 'rent');
  $('#more').href = '/properties?' + more;
  api('/api/properties?' + q).then(async (d) => {
    $('#count').textContent = d.total ? `${VB.fmt(d.total)} ${d.total === 1 ? 'оферта' : 'оферти'}` : 'Няма публикувани оферти в момента';
    $('#grid').innerHTML = d.items.length ? d.items.map((p) => VB.card(p)).join('') : '<p class="empty">В момента няма оферти по тези критерии. Остави запитване и ще те уведомим, когато се появят.</p>';
    await VB.ready; VB.refreshHearts();
  }).catch(() => { $('#count').textContent = ''; $('#grid').innerHTML = '<p class="empty">Офертите не могат да бъдат заредени в момента.</p>'; });
})();
