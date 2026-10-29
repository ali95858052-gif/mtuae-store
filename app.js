// ===== المتجر: كل منتج بييجي من products.json =====
const WA = '971563720054';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '{}'); // { id: qty }

const $ = (id) => document.getElementById(id);
const save = () => localStorage.setItem('cart', JSON.stringify(cart));

async function init() {
  products = await (await fetch('products.json')).json();
  // نقسّم المتجر: خدمات التصميم فوق، والمنتجات الرقمية تحت، وكل قسم بعنوان
  const head = (t, sub) => `<div class="sec-head" style="grid-column:1/-1;text-align:center;margin:18px 0 4px">
      <h3 style="font-size:1.45rem;font-weight:900;margin:0">${t}</h3>
      <p style="opacity:.75;margin:6px 0 0">${sub}</p></div>`;
  const services = products.filter(p => p.type === 'service');
  const digital = products.filter(p => p.type !== 'service');
  const card = p => `
    <div class="card">
      ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
      <div class="em">${p.emoji}</div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div class="price">${p.price} <small>درهم</small></div>
      ${p.type === 'service'
        ? `<button onclick="orderService('${p.id}')">اطلب عبر واتساب 💬</button>`
        : `<button onclick="add('${p.id}')">أضف للسلة 🛒</button>`}
    </div>`;
  $('grid').innerHTML =
    (services.length ? head('🌐 خدمات التصميم', 'مواقع احترافية لنشاطك · تسليم خلال 72 ساعة · اطلبها عبر واتساب') + services.map(card).join('') : '') +
    head('📦 المنتجات الرقمية', 'اشتري، حمّل، وابدأ فورًا') + digital.map(card).join('');
  // الخدمات (تصميم المواقع) ما تدخلش السلة ولا الدفع الأونلاين
  Object.keys(cart).forEach(id => { const p = products.find(x => x.id === id); if (!p || p.type === 'service') delete cart[id]; });
  save();
  render();
}

// خدمة (زي تصميم المواقع): تفتح واتساب برسالة جاهزة بدل السلة
function orderService(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  if (typeof fbq === 'function') fbq('track', 'Lead', { content_name: p.name, value: p.price, currency: 'AED' });
  window.open(p.wa || `https://wa.me/${WA}?text=${encodeURIComponent('مرحبا، أريد طلب ' + p.name + ' (' + p.price + ' درهم)')}`, '_blank');
}

function add(id) { cart[id] = (cart[id] || 0) + 1; save(); render(); openCart(); }
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
