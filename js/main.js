// Обяви (примерни данни)
const props=[
 ["Двустаен, Лозенец","София","2-стаен · 68 м² · 4 ет.",168000,"#0E3B43","#5FA8A0"],
 ["Тристаен, Младост 3","София","3-стаен · 94 м² · 6 ет.",142000,"#2B6B6A","#F2B84B"],
 ["Къща с двор, Бояна","София","Къща · 210 м² · 2 000 м² двор",420000,"#0A2A30","#5FA8A0"],
 ["Едностаен, Тракия","Пловдив","1-стаен · 46 м² · 3 ет.",69000,"#3C7D78","#EAF2F1"],
 ["Тристаен, Център","Пловдив","3-стаен · 102 м² · 2 ет.",155000,"#0E3B43","#F2B84B"],
 ["Апартамент, Бриз","Варна","2-стаен · 74 м² · 5 ет.",132000,"#1F5A62","#9ED0C9"],
 ["Къща, Виница","Варна","Къща · 160 м² · гледка море",295000,"#0A2A30","#F2B84B"],
 ["Двустаен, Сарафово","Бургас","2-стаен · 63 м² · 1 ет.",88000,"#2B6B6A","#EAF2F1"]
];
const grid=document.getElementById('grid');
const fmt=n=>n.toLocaleString('bg-BG')+' €';
function render(city){
 grid.innerHTML=props.filter(p=>city==='all'||p[1]===city).map(p=>`
 <article class="prop"><div class="pic" style="--c1:${p[4]};--c2:${p[5]}"><span>${p[1]}</span></div>
 <div class="b"><h3>${p[0]}</h3><p>${p[2]}</p><strong>${fmt(p[3])}</strong></div></article>`).join('');
}
render('all');
document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{
 document.querySelectorAll('.chip').forEach(x=>x.classList.remove('on'));c.classList.add('on');render(c.dataset.city);
});

// Меню
const burger=document.querySelector('.burger'),nav=document.getElementById('nav');
burger.onclick=()=>{const o=nav.classList.toggle('open');burger.setAttribute('aria-expanded',o)};
nav.querySelectorAll('a').forEach(a=>a.onclick=()=>nav.classList.remove('open'));

// Форма
const form=document.getElementById('lead-form'),msg=form.querySelector('.msg');
const steps=[...form.querySelectorAll('.step')];
const show=i=>steps.forEach((s,k)=>s.classList.toggle('on',k===i));
const bad=(el,v)=>{el.classList.toggle('invalid',!v);return v};
form.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{form.querySelectorAll('.tab').forEach(x=>x.classList.remove('on'));t.classList.add('on')});
form.querySelector('[data-next]').onclick=()=>{
 const ok=[form.type,form.city].map(el=>bad(el,!!el.value)).every(Boolean);if(ok)show(1);
};
form.querySelector('[data-back]').onclick=()=>show(0);
form.onsubmit=e=>{
 e.preventDefault();
 const ok=[bad(form.name,form.name.value.trim().length>1),bad(form.phone,/^[+\d\s()-]{7,}$/.test(form.phone.value))].every(Boolean)&&form.consent.checked;
 if(!ok){msg.hidden=false;msg.textContent='Провери името, телефона и съгласието.';return}
 const mode=form.querySelector('.tab.on').dataset.mode;
 msg.hidden=false;msg.textContent=`Благодарим, ${form.name.value.trim()}! Заявка „${mode}“ е приета (демо – данните не се изпращат).`;
 form.reset();show(0);
};

// Лента „на живо“
const live=document.getElementById('live-msg');
const lines=['Нов клиент току-що поиска оферта','Преди 1 минута: нов купувач се регистрира','Преди 2 минути: нов имот е добавен'];
let n=0;setInterval(()=>{live.textContent=lines[++n%lines.length]},4000);
