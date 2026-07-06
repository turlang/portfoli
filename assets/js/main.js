const menuBtn = document.querySelector('.menu-btn');
const nav = document.querySelector('.main-nav');
if (menuBtn && nav) {
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
}

const cards = [...document.querySelectorAll('.project-card')];
const carousel = document.getElementById('projectCarousel');
const dots = document.getElementById('projectDots');
let current = 0;

function renderDots(){
  if(!dots || !cards.length) return;
  dots.innerHTML = cards.map((_,i)=>`<button class="${i===current?'active':''}" aria-label="Projeto ${i+1}"></button>`).join('');
  [...dots.children].forEach((btn,i)=>btn.addEventListener('click',()=>{current=i;updateCarousel();}));
}
function updateCarousel(){
  if(!cards.length) return;
  const total = cards.length;
  cards.forEach((card,i)=>{
    let offset = i - current;
    if(offset > total/2) offset -= total;
    if(offset < -total/2) offset += total;
    const abs = Math.abs(offset);
    card.classList.toggle('active', offset===0);
    card.style.zIndex = String(10 - abs);
    card.style.opacity = abs > 2 ? '0' : String(1 - abs * .18);
    card.style.filter = abs > 0 ? 'brightness(.78)' : 'brightness(1.05)';
    card.style.transform = `translateX(calc(-50% + ${offset * 270}px)) translateZ(${-abs * 140}px) rotateY(${offset * -18}deg) scale(${1 - abs * .08})`;
  });
  renderDots();
}

document.querySelector('.carousel-btn.prev')?.addEventListener('click',()=>{current=(current-1+cards.length)%cards.length;updateCarousel();});
document.querySelector('.carousel-btn.next')?.addEventListener('click',()=>{current=(current+1)%cards.length;updateCarousel();});
let timer = cards.length ? setInterval(()=>{current=(current+1)%cards.length;updateCarousel();}, 4500) : null;
carousel?.addEventListener('mouseenter',()=> timer && clearInterval(timer));
carousel?.addEventListener('mouseleave',()=> timer = setInterval(()=>{current=(current+1)%cards.length;updateCarousel();}, 4500));
updateCarousel();

cards.forEach(card=>{
  card.addEventListener('mousemove', e=>{
    const r = card.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width - .5;
    const y = (e.clientY-r.top)/r.height - .5;
    if(card.classList.contains('active')) card.style.setProperty('--tilt', `rotateX(${y*-6}deg) rotateY(${x*6}deg)`);
  });
});
