(function () {
  const { $, fmt } = VB;
  const el = { price: $('#c-price'), down: $('#c-down'), years: $('#c-years'), rate: $('#c-rate') };
  const q = Number(new URLSearchParams(location.search).get('price'));
  if (q >= 10000 && q <= 100000000) el.price.value = Math.round(q);
  const eur = (n) => fmt(Math.round(n)) + ' €';

  function calc() {
    const price = Math.max(Number(el.price.value) || 0, 0);
    const downPct = Number(el.down.value), years = Number(el.years.value), rate = Number(el.rate.value);
    $('#v-down').textContent = downPct + '%'; $('#v-years').textContent = years + ' г.'; $('#v-rate').textContent = rate.toFixed(1).replace('.', ',') + '%';
    const down = price * downPct / 100, loan = price - down, n = years * 12, r = rate / 100 / 12;
    const m = r === 0 ? loan / n : loan * r / (1 - Math.pow(1 + r, -n));
    const total = m * n, interest = total - loan;
    $('#r-month').textContent = eur(m); $('#r-loan').textContent = eur(loan); $('#r-downv').textContent = eur(down);
    $('#r-int').textContent = eur(interest); $('#r-total').textContent = eur(total);
    const pp = total > 0 ? (loan / total) * 100 : 0;
    $('#b-p').style.width = pp + '%'; $('#b-i').style.width = (100 - pp) + '%';
  }
  Object.values(el).forEach((i) => i.addEventListener('input', calc));
  calc();

  $('#m-form').onsubmit = (e) => {
    e.preventDefault();
    const msg = `Ипотечна консултация. Цена ${eur(Number(el.price.value))}, самоучастие ${el.down.value}%, срок ${el.years.value} г., лихва ${el.rate.value}%.`;
    VB.sendLead(e.target, 'mortgage', { message: msg });
  };
})();
