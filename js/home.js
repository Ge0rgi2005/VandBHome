(function () {
  const { $, $$, api, esc } = VB;

  // ----- Форма: „Вземи оферта“ / „Обяви имота си“ -----
  const form = $('#lead-form');
  let kind = 'offer';
  const go = (n) => {
    $$('.step', form).forEach((s) => s.classList.toggle('on', s.dataset.step === String(n)));
    $$('.steps-dots i', form).forEach((d, i) => d.classList.toggle('on', i < n));
  };
  $$('.tab', form).forEach((t) => (t.onclick = () => {
    kind = t.dataset.kind;
    $$('.tab', form).forEach((x) => { const on = x === t; x.classList.toggle('on', on); x.setAttribute('aria-selected', on); });
    $('#sell-box').hidden = kind === 'search';
    $('#buy-box').classList.toggle('on', kind === 'search');
    $('.msg', form).hidden = true;
  }));
  $('#hs-go').onclick = () => {
    const q = new URLSearchParams();
    if ($('#hs-deal').value === 'rent') q.set('deal', 'rent');
    if ($('#hs-city').value) q.set('city', $('#hs-city').value);
    if ($('#hs-type').value) q.set('type', $('#hs-type').value);
    if ($('#hs-price').value) q.set('maxPrice', $('#hs-price').value);
    location.href = '/properties' + (q.toString() ? '?' + q : '');
  };
  $('[data-next]', form).onclick = () => {
    const t = form.elements.type, c = form.elements.city;
    [t, c].forEach((x) => x.classList.toggle('invalid', !x.value));
    if (!t.value || !c.value) { const m = $('.msg', form); m.textContent = 'Избери тип имот и град.'; m.className = 'msg'; m.hidden = false; return; }
    $('.msg', form).hidden = true; go(2);
  };
  $('[data-back]', form).onclick = () => go(1);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const ok = await VB.sendLead(form, kind);
    if (ok) go(1);
  };

  // ----- „На живо“ известия -----
  let i = 0; const live = $('#live-msg');
  setInterval(() => {
    const msgs = (VB.site.home && VB.site.home.live) || [];
    if (!msgs.length) return;
    i = (i + 1) % msgs.length; live.textContent = msgs[i];
  }, 3800);

  // ----- Най-нови обяви -----
  (async () => {
    const grid = $('#grid');
    try {
      const d = await api('/api/properties?pageSize=6&sort=featured');
      grid.innerHTML = d.items.length ? d.items.map((p) => VB.card(p)).join('') : '<p class="empty">Все още няма публикувани обяви.</p>';
      await VB.ready; VB.refreshHearts();
    } catch (_) { grid.innerHTML = '<p class="empty">Обявите не могат да бъдат заредени в момента.</p>'; }
  })();
})();
