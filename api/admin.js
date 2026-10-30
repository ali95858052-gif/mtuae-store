// لوحة التحكم: قراءة وحفظ الخدمات والنصوص، وجلب الإحصائيات. كل حاجة هنا محمية بالباسورد.
const L = require('./_lib');

const FILES = { products: 'products.json', site: 'site.json' };
const sleep = ms => new Promise(r => setTimeout(r, ms));

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!process.env.ADMIN_PASSWORD) return res.status(500).json({ error: 'setup', need: 'ADMIN_PASSWORD' });
  if (!L.checkPassword(req)) { await sleep(900); return res.status(401).json({ error: 'الباسورد غلط' }); }

  const action = (req.query && req.query.action) || 'load';
  try {
    // ===== تحميل كل البيانات =====
    if (req.method === 'GET' && action === 'load') {
      if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'setup', need: 'GITHUB_TOKEN' });
      const [p, s] = await Promise.all([L.readFile(FILES.products), L.readFile(FILES.site)]);
      return res.json({ products: p.data || [], productsSha: p.sha, site: s.data, siteSha: s.sha, stats: L.hasRedis() });
    }

    // ===== حفظ (الخدمات أو النصوص) =====
    if (req.method === 'POST' && action === 'save') {
      if (!process.env.GITHUB_TOKEN) return res.status(500).json({ error: 'setup', need: 'GITHUB_TOKEN' });
      const body = L.readBody(req), out = {};
      if (body.products) {
        const list = L.validateProducts(body.products);
        out.productsSha = await L.writeFile(FILES.products, L.productsText(list), body.productsSha, 'تعديل الخدمات من لوحة التحكم');
      }
      if (body.site) {
        const site = L.validateSite(body.site);
        out.siteSha = await L.writeFile(FILES.site, JSON.stringify(site, null, 1) + '\n', body.siteSha, 'تعديل نصوص المتجر من لوحة التحكم');
      }
      return res.json({ ok: true, ...out });
    }

    // ===== الإحصائيات =====
    if (req.method === 'GET' && action === 'stats') {
      if (!L.hasRedis()) return res.json({ enabled: false });
      const days = Math.max(1, Math.min(90, parseInt(req.query.days) || 7));
      const keys = [];
      for (let i = 0; i < days; i++) keys.push('st:' + new Date(Date.now() + 4 * 3600e3 - i * 864e5).toISOString().slice(0, 10));
      const res2 = await L.redis([...keys.map(k => ['HGETALL', k]), ['LRANGE', 'recent', 0, 49]]);
      const totals = {}, daily = [];
      keys.forEach((k, i) => {
        const arr = res2[i] || [], day = {};
        for (let j = 0; j < arr.length; j += 2) { const n = Number(arr[j + 1]) || 0; day[arr[j]] = n; totals[arr[j]] = (totals[arr[j]] || 0) + n; }
        daily.push({ date: k.slice(3), visit: day.visit || 0, order: (day.order || 0) + (day.quiz_order || 0) });
      });
      const recent = (res2[keys.length] || []).map(x => { try { return JSON.parse(x); } catch (e) { return null; } }).filter(Boolean);
      return res.json({ enabled: true, days, totals, daily: daily.reverse(), recent });
    }

    return res.status(400).json({ error: 'طلب مش معروف' });
  } catch (e) {
    if (e.code === 409) return res.status(409).json({ error: 'conflict' });
    return res.status(400).json({ error: e.message || 'حصل خطأ' });
  }
};
