// Обяви – зареждат се от базата (Neon) през /api/properties.
// Ако API-то не е достъпно (напр. файлът е отворен локално), се показват примерни данни.
const FALLBACK=[
 {id:1,title:"Двустаен, Лозенец",city:"София",details:"2-стаен · 68 м² · 4 ет.",price:168000},
 {id:2,title:"Тристаен, Младост 3",city:"София",details:"3-стаен · 94 м² · 6 ет.",price:142000},
 {id:3,title:"Къща с двор, Бояна",city:"София",details:"Къща · 210 м² · 2 000 м² двор",price:420000},
 {id:4,title:"Едностаен, Тракия",city:"Пловдив",details:"1-стаен · 46 м² · 3 ет.",price:69000},
 {id:5,title:"Тристаен, Център",city:"Пловдив",details:"3-стаен · 102 м² · 2 ет.",price:155000},
 {id:6,title:"Апартамент, Бриз",city:"Варна",details:"2-стаен · 74 м² · 5 ет.",price:132000},
 {id:7,title:"Къща, Виница",city:"Варна",details:"Къща · 160 м² · гледка море",price:295000},
 {id:8,title:"Двустаен, Сарафово",city:"Бургас",details:"2-стаен · 63 м² · 1 ет.",price:88000}
];
const PALETTE=[["#0E3B43","#5FA8A0"],["#2B6B6A","#F2B84B"],["#0A2A30","#5FA8A0"],["#3C7D78","#EAF2F1"],["#0E3B43","#F2B84B"],["#1F5A62","#9ED0C9"],["#0A2A30","#F2B84B"],["#2B6B6A","#EAF2F1"]];
let props=[],curCity='all';
const grid=document.getElementById('grid'),chipsBox=document.querySelector('.chips');
const fmt=n=>Number(n).toLocaleString('bg-BG')+' €';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function render(){
 const list=props.filter(p=>curCity==='all'||p.city===curCity);
 if(!list.length){grid.innerHTML='<p class="small">Няма обяви в момента.</p>';return}
 grid.innerHTML=list.map(p=>{
  const [c1,c2]=PALETTE[p.id%PALETTE.length];
  const img=/^https?:\/\//i.test(p.image_url||'')?`<img src="${esc(p.image_url)}" alt="" loading="lazy" onerror="this.remove()">`:'';
  return `<article class="prop"><div class="pic" style="--c1:${c1};--c2:${c2}">${img}<span>${esc(p.city)}</span></div>
 <div class="b"><h3>${esc(p.title)}</h3><p>${esc(p.details)}</p><strong>${fmt(p.price)}</strong></div></article>`}).join('');
}
function renderChips(){
 const cities=[...new Set(props.map(p=>p.city))].sort((a,b)=>a.localeCompare(b,'bg'));
 if(curCity!=='all'&&!cities.includes(curCity))curCity='all';
 chipsBox.innerHTML=['all',...cities].map(c=>`<button class="chip${c===curCity?' on':''}" data-city="${esc(c)}">${c==='all'?'Всички':esc(c)}</button>`).join('');
}
chipsBox.addEventListener('click',e=>{
 const b=e.target.closest('.chip');if(!b)return;
 curCity=b.dataset.city;
 chipsBox.querySelectorAll('.chip').forEach(x=>x.classList.toggle('on',x===b));
 render();
});
async function loadProps(){
 try{
  const r=await fetch('/api/properties',{headers:{Accept:'application/json'}});
  if(!r.ok)throw new Error(r.status);
  props=await r.json();
 }catch(_){props=FALLBACK}
 renderChips();render();
}
loadProps();

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
