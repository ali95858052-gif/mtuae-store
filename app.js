// ===== المتجر: كل منتج بييجي من products.json =====
const WA = '971563720054';
let products = [];
let cart = JSON.parse(localStorage.getItem('cart') || '{}'); // { id: qty }

const $ = (id) => document.getElementById(id);
const save = () => localStorage.setItem('cart', JSON.stringify(cart));

async function init() {
  products = await (await fetch('products.json')).json();
  $('grid').innerHTML = products.map(p => `
    <div class="card" onclick="openProduct('${p.id}')">
      ${p.tag ? `<span class="tag">${p.tag}</span>` : ''}
      <div class="em">${p.emoji}</div>
      <h3>${p.name}</h3>
      <p>${p.desc}</p>
      <div class="price">${p.price} <small>درهم</small></div>
      <button onclick="event.stopPropagation();add('${p.id}')">أضف للسلة 🛒</button>
    </div>`).join('');
  render();
}

function openProduct(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  $('pmBody').innerHTML = `
    <div class="em">${p.emoji}</div>
    ${p.tag ? `<span class="ptag">${p.tag}</span>` : ''}
    <h2>${p.name}</h2>
    <p class="pd">${p.desc}</p>
    <ul>${(p.includes || []).map(i => `<li>✅ ${i}</li>`).join('')}</ul>
    <div class="price">${p.price} <small>درهم</small></div>
    <button class="pbtn" onclick="add('${p.id}');closeProduct()">أضف للسلة 🛒</button>`;
  $('pm').classList.add('on');
}
function closeProduct() { $('pm').classList.remove('on'); }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProduct(); });

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
