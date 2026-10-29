// ===== المتجر: كل منتج بييجي من products.json =====
const WA = '971563720054';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '{}'); // { id: qty }

const $ = (id) => document.getElementById(id);
// المنتج اللي عليه شارة "قريبًا" (أو soon: true) ما يتباعش لحد ما يجهز
const isSoon = (p) => p.soon === true || (p.tag || '').includes('قريب');
const save = () => localStorage.setItem('cart', JSON.stringify(cart));

// أقسام المتجر بالترتيب: كل خدمة بتتحط في قسمها حسب cat في products.json
const SECTIONS = [
  { cat: 'ads',    icon: '📣', title: 'التسويق الممول',      sub: 'إعلانات على إنستغرام وفيسبوك · السعر شامل ميزانية الإعلان' },
  { cat: 'social', icon: '📱', title: 'إدارة السوشيال ميديا', sub: 'نشتغل على حساباتك بالكامل كل شهر · ميزانية الإعلانات منفصلة' },
  { cat: 'media',  icon: '🎬', title: 'الفيديو والتصميم',     sub: 'فيديوهات إعلانية وتصاميم بهوية علامتك' },
  { cat: 'web',    icon: '🌐', title: 'تصميم المواقع',        sub: 'مواقع احترافية لنشاطك · تسليم خلال 72 ساعة' },
];
const HOT = ['الأكثر طلبًا', 'الأشمل'];   // البطاقات المميزة بإطار أحمر
const SHOW = 5;                            // عدد المميزات الظاهرة قبل "عرض الكل"
const FOLD = 7;                            // نخبّي الباقي بس لو المميزات أكتر من 7

async function init() {
  products = await (await fetch('products.json')).json();
  const fmt = n => Number(n).toLocaleString('en-US');

  const card = p => {
    // لو مفيش features بنقسم الوصف اللي فيه " · " لقائمة
    let desc = p.desc || '', feats = p.features;
    if (!feats && desc.includes(' · ')) { const parts = desc.split(' · '); desc = parts.shift(); feats = parts; }
    const list = feats ? `<ul class="feat">${feats.map((f, i) => `<li${feats.length > FOLD && i >= SHOW ? ' class="more"' : ''}>${f}</li>`).join('')}</ul>
      ${feats.length > FOLD ? `<button class="morebtn" onclick="toggleMore(this)">+ عرض كل المميزات (${feats.length})</button>` : ''}` : '';
    const btn = isSoon(p) ? `<button class="cta" disabled>قريبًا ⏳</button>`
      : p.type === 'service' ? `<button class="cta" onclick="orderService('${p.id}')">اطلب عبر واتساب 💬</button>`
      : `<button class="cta" onclick="add('${p.id}')">أضف للسلة 🛒</button>`;
    return `<article class="card${HOT.includes(p.tag) ? ' hot' : ''}">
      ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
      <div class="em">${p.emoji}</div>
      <h3>${p.name}</h3>
      ${desc ? `<p class="desc">${desc}</p>` : ''}
      ${list}
      <div class="price"><b>${fmt(p.price)}</b><span>درهم${p.per ? ' / ' + p.per : ''}</span></div>
      ${btn}
    </article>`;
  };

  const known = SECTIONS.map(s => s.cat);
  const secs = SECTIONS.map(s => ({ ...s, items: products.filter(p => p.type === 'service' && p.cat === s.cat) }));
  const other = products.filter(p => p.type === 'service' && !known.includes(p.cat));
  if (other.length) secs.push({ cat: 'other', icon: '✨', title: 'خدمات أخرى', sub: 'اطلبها عبر واتساب', items: other });
  const digital = products.filter(p => p.type !== 'service');
  if (digital.length) secs.push({ cat: 'digital', icon: '📦', title: 'المنتجات الرقمية', sub: 'اشتري، حمّل، وابدأ فورًا', items: digital });
  const shown = secs.filter(s => s.items.length);

  $('grid').innerHTML = shown.map((s, i) => `
    <section class="sec" id="sec-${s.cat}">
      <div class="sec-head"><span class="num">${String(i + 1).padStart(2, '0')}</span>
        <h3>${s.icon} ${s.title}</h3><p>${s.sub}</p></div>
      <div class="grid">${s.items.map(card).join('')}</div>
    </section>`).join('');

  // القائمة السريعة فوق: تودّي على القسم وتنوّر القسم الحالي
  $('secnav').innerHTML = shown.map(s => `<a href="#sec-${s.cat}" data-cat="${s.cat}">${s.icon} ${s.title}</a>`).join('');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      document.querySelectorAll('.secnav a').forEach(a => a.classList.toggle('on', a.dataset.cat === e.target.id.slice(4)));
      const on = document.querySelector('.secnav a.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'center' });
    }), { rootMargin: '-45% 0px -50% 0px' });
    document.querySelectorAll('.sec').forEach(el => io.observe(el));
  }

  // حركة البطاقة مع الماوس (على الكمبيوتر بس، وبهدوء)
  if (matchMedia('(hover:hover) and (pointer:fine)').matches && !matchMedia('(prefers-reduced-motion:reduce)').matches) {
    document.querySelectorAll('.card').forEach(c => {
      c.addEventListener('pointermove', e => {
        const r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        c.style.setProperty('--ry', ((x - .5) * 8).toFixed(2) + 'deg');
        c.style.setProperty('--rx', ((.5 - y) * 6).toFixed(2) + 'deg');
        c.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
        c.style.setProperty('--my', (y * 100).toFixed(1) + '%');
      });
      c.addEventListener('pointerleave', () => { c.style.setProperty('--rx', '0deg'); c.style.setProperty('--ry', '0deg'); });
    });
  }

  // زرار السلة يظهر بس لو فيه منتجات بتتشتري أونلاين
  $('openCart').style.display = digital.some(p => !isSoon(p)) ? '' : 'none';
  Object.keys(cart).forEach(id => { const p = products.find(x => x.id === id); if (!p || p.type === 'service' || isSoon(p)) delete cart[id]; });
  save();
  render();
}

function toggleMore(b) {
  const c = b.closest('.card'); const open = c.classList.toggle('open');
  b.textContent = open ? '− إخفاء المميزات' : `+ عرض كل المميزات (${c.querySelectorAll('.feat li').length})`;
}

// خدمة (زي تصميم المواقع): تفتح واتساب برسالة جاهزة بدل السلة
function orderService(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: p.name, value: p.price, currency: 'AED' });
  window.open(p.wa || `https://wa.me/${WA}?text=${encodeURIComponent('مرحبا، أريد طلب ' + p.name + ' (' + p.price + ' درهم)')}`, '_blank');
}

function add(id) { const p = products.find(x => x.id === id); if (!p || isSoon(p) || p.type === 'service') return; cart[id] = (cart[id] || 0) + 1; save(); render(); openCart(); }
function change(id, d) { cart[id] = (cart[id] || 0) + d; if (cart[id] <= 0) delete cart[id]; save(); render(); }

function render() {
  const ids = Object.keys(cart);
  let total = 0, count = 0, lines = [];
  $('items').innerHTML = ids.length ? ids.map(id => {
    const p = products.find(x => x.id === id); if (!p) return '';
    total += p.price * cart[id]; count += cart[id];
    lines.push(`${p.name} × ${cart[id]}`);
    return `<div class="row"><span class="n">${p.emoji} ${p.name}</span>
      <button onclick="change('${id}',-1)">−</button><b>${cart[id]}</b><button onclick="change('${id}',1)">+</button></div>`;
  }).join('') : '<div class="empty">السلة فاضية</div>';
  $('total').textContent = total; $('count').textContent = count;
  const text = `السلام عليكم، حابب أطلب:\n${lines.join('\n')}\nالإجمالي: ${total} درهم`;
  $('waOrder').href = `https://wa.me/${WA}?text=${encodeURIComponent(text)}`;
}

function openCart() { $('drawer').classList.add('open'); $('overlay').classList.add('on'); }
function closeCart() { $('drawer').classList.remove('open'); $('overlay').classList.remove('on'); }
$('openCart').onclick = openCart; $('closeCart').onclick = closeCart; $('overlay').onclick = closeCart;

$('checkout').onclick = async () => {
  const items = Object.keys(cart).map(id => ({ id, qty: cart[id] }));
  if (!items.length) { $('msg').textContent = 'السلة فاضية'; return; }
  $('msg').textContent = 'جاري تحويلك لصفحة الدفع...';
  try {
    const r = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items }) });
    const data = await r.json();
    if (data.url) { location.href = data.url; return; }
    throw new Error(data.error || 'خطأ');
  } catch (e) {
    $('msg').textContent = 'الدفع الأونلاين غير مفعّل بعد، تقدر تطلب عبر واتساب 👇';
  }
};
init();
