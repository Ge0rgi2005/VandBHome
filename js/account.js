(function () {
  const { $, api, esc, fmt } = VB;
  const guest = $('#acc-guest'), user = $('#acc-user'), grid = $('#fav-grid');
  $('#g-login').onclick = () => VB.openAuth('login');
  $('#g-reg').onclick = () => VB.openAuth('register');
  $('#a-logout').onclick = () => VB.logout();
  $('#a-del').onclick = async () => {
    if (!confirm('Да изтрия ли профила ти и всички запазени имоти? Действието е необратимо.')) return;
    try { await api('/api/account', { method: 'POST', body: { action: 'delete' } }); VB.user = null; VB.favs = new Set(); location.href = '/'; }
    catch (e) { VB.toast(e.message); }
  };

  function chip(p) {
    if (!p.price_saved || p.price_saved === p.price) return '';
    const diff = p.price - p.price_saved, down = diff < 0;
    return `<span class="alert-chip ${down ? 'down' : 'up'}">${down ? '▼ Цената падна' : '▲ Цената се покачи'} с ${fmt(Math.abs(diff))} € (беше ${fmt(p.price_saved)} €)</span>`;
  }

  async function show() {
    await VB.ready;
    if (!VB.user) { guest.hidden = false; user.hidden = true; $('#acc-sub').textContent = 'Влез, за да видиш запазените си имоти.'; return; }
    guest.hidden = true; user.hidden = false;
    $('#acc-sub').textContent = VB.user.name ? `Здравей, ${VB.user.name}!` : 'Любими имоти и следене на цените.';
    $('#acc-mail').textContent = VB.user.email;
    try {
      const list = await api('/api/favorites');
      grid.innerHTML = list.length
        ? list.map((p) => VB.card(p, { extra: chip(p) ? `<div>${chip(p)}</div>` : '' })).join('')
        : '<p class="empty">Още нямаш запазени имоти. Натисни сърцето на всяка обява, за да я следиш.</p>';
      VB.refreshHearts();
    } catch (e) { grid.innerHTML = `<p class="empty">${esc(e.message)}</p>`; }
  }
  document.addEventListener('vb:auth', show);
  document.addEventListener('vb:fav', show);
  show();
})();
