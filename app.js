// ===== المتجر: كل منتج بييجي من products.json =====
const WA = '971563720054';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '{}'); // { id: qty }

const $ = (id) => document.getElementById(id);
// المنتج اللي عليه شارة "قريبًا" (أو soon: true) ما يتباعش لحد ما يجهز
const isSoon = (p) => p.soon === true || (p.tag || '').includes('قريب');
const save = () => localStorage.setItem('cart', JSON.stringify(cart));

// أقسام المتجر بالترتيب: كل خدمة بتتحط في قسمها حسب cat في products.json
// أيقونات مرسومة (SVG) بدل الإيموجي عشان تطلع نفس الشكل على كل الأجهزة
const ICONS = {
  ads:     '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  social:  '<rect x="6" y="2.5" width="12" height="19" rx="2.5"/><path d="M10.5 18.5h3"/><path d="M9 9.5l2 2 4-4"/>',
  media:   '<rect x="2.5" y="5" width="15" height="14" rx="2.5"/><path d="M17.5 10l4-2.5v9l-4-2.5"/><path d="M8.5 9.5v5l4-2.5z"/>',
  web:     '<circle cx="12" cy="12" r="9.5"/><path d="M2.5 12h19M12 2.5c2.8 2.6 4 6 4 9.5s-1.2 6.9-4 9.5c-2.8-2.6-4-6-4-9.5s1.2-6.9 4-9.5z"/>',
  other:   '<path d="M12 3l2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4 6.7 19.4l1.2-6L3.4 9.3l6-.7z"/>',
  digital: '<path d="M3 7.5L12 3l9 4.5v9L12 21l-9-4.5z"/><path d="M3 7.5l9 4.5 9-4.5M12 12v9"/>',
};
const icon = k => `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[k] || ICONS.other}</svg>`;

// كل قسم: عنوان + جملة تسويقية + نقاط قصيرة
const SECTIONS = [
  { cat: 'ads',    title: 'التسويق الممول',      tagline: 'إعلانات تجيبلك عملاء حقيقيين، مش مجرد لايكات',
    chips: ['إنستغرام وفيسبوك', 'هدف مبيعات أو رسائل واتساب', '★ السعر شامل ميزانية الإعلان'] },
  { cat: 'social', title: 'إدارة السوشيال ميديا', tagline: 'نتولّى حساباتك بالكامل، وإنت ركّز على شغلك',
    chips: ['محتوى + ريلز + قصص', 'تقارير أداء شهرية', 'ميزانية الإعلانات منفصلة'] },
  { cat: 'media',  title: 'الفيديو والتصميم',     tagline: 'فيديو إعلاني من صورك، من غير تصوير ولا مونتاج',
    chips: ['جاهز لإنستغرام وتيك توك', 'بألوان علامتك وشعارك', '★ يبدأ من 39 درهم'] },
  { cat: 'web',    title: 'تصميم المواقع',        tagline: 'موقع احترافي باسم نشاطك، جاهز خلال 72 ساعة',
    chips: ['رابط باسم شركتك', 'استضافة سنة + SSL', 'تعديل فوري بالمحادثة'] },
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
  if (other.length) secs.push({ cat: 'other', title: 'خدمات أخرى', tagline: 'اطلبها عبر واتساب', chips: [], items: other });
  const digital = products.filter(p => p.type !== 'service');
  if (digital.length) secs.push({ cat: 'digital', title: 'المنتجات الرقمية', tagline: 'اشتري، حمّل، وابدأ فورًا', chips: [], items: digital });
  const shown = secs.filter(s => s.items.length);

  $('grid').innerHTML = shown.map((s, i) => `
    <section class="sec" id="sec-${s.cat}">
      <div class="sec-head">
        <div class="eyebrow">${icon(s.cat)}<span>${String(i + 1).padStart(2, '0')}</span></div>
        <h3>${s.title}</h3>
        <p class="tagline">${s.tagline}</p>
        ${s.chips.length ? `<div class="chips">${s.chips.map(c => c.startsWith('★') ? `<span class="hl">${c.slice(1).trim()}</span>` : `<span>${c}</span>`).join('')}</div>` : ''}
      </div>
      <div class="grid">${s.items.map(card).join('')}</div>
    </section>`).join('');

  // القائمة السريعة فوق: تودّي على القسم وتنوّر القسم الحالي
  $('secnav').innerHTML = shown.map(s => `<a href="#sec-${s.cat}" data-cat="${s.cat}">${icon(s.cat)}${s.title}</a>`).join('');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      document.querySelectorAll('.secnav a').forEach(a => a.classList.toggle('on', a.dataset.cat === e.target.id.slice(4)));
      // نحرّك القائمة نفسها بس (من غير ما نلمس سكرول الصفحة)
      const on = document.querySelector('.secnav a.on'), nav = $('secnav');
      if (on && nav.scrollWidth > nav.clientWidth) nav.scrollLeft = on.offsetLeft - (nav.clientWidth - on.offsetWidth) / 2;
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
