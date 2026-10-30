(function () {
  const { $, $$ } = VB;

  // Обяви имот
  const a = $('#a-form');
  if (a) a.onsubmit = (e) => {
    e.preventDefault();
    const f = a.elements;
    const parts = [`Сделка: ${f.deal.value}`, f.district.value.trim() && `Квартал: ${f.district.value.trim()}`, f.area.value && `Площ: ${f.area.value} м²`, f.price.value && `Очаквана цена: ${f.price.value} €`, f.message.value.trim()].filter(Boolean);
    if (!f.type.value || !f.city.value) { const m = $('.msg', a); m.textContent = 'Избери тип имот и град.'; m.className = 'msg'; m.hidden = false; return; }
    VB.sendLead(a, 'listing', { message: parts.join(' · ') });
  };

  // Кариери
  const k = $('#k-form');
  if (k) {
    k.onsubmit = (e) => { e.preventDefault(); VB.sendLead(k, 'career'); };
    $$('[data-pos]').forEach((b) => b.addEventListener('click', () => { $('#k-pos').value = b.dataset.pos; }));
  }
})();
