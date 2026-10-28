// دالة بتشتغل على Vercel: بتعمل صفحة دفع Stripe بالأسعار من السيرفر (مش من المتصفح)
const Stripe = require('stripe');
const products = require('../products.json');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'Stripe not configured' });
  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const items = (req.body && req.body.items) || [];
    const line_items = items.map(i => {
      const p = products.find(x => x.id === i.id);
      const qty = Math.max(1, Math.min(10, parseInt(i.qty) || 1));
      if (!p) throw new Error('منتج غير معروف');
      return { quantity: qty, price_data: { currency: 'aed', unit_amount: p.price * 100, product_data: { name: p.name } } };
    });
    if (!line_items.length) return res.status(400).json({ error: 'السلة فاضية' });
    const origin = req.headers.origin || `https://${req.headers.host}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', line_items,
      success_url: `${origin}/success.html`, cancel_url: `${origin}/`
    });
    res.json({ url: session.url });
  } catch (e) { res.status(500).json({ error: e.message }); }
};
