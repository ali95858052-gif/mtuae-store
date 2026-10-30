// أدوات مشتركة للوحة التحكم (الملفات اللي بتبدأ بـ _ مش بتبقى روابط على Vercel)
const crypto = require('crypto');

// ===== قاعدة الإحصائيات (Upstash Redis) =====
// بتشتغل مع أسماء المتغيرات اللي Vercel أو Upstash بيحطها لوحده
const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const hasRedis = () => !!(REDIS_URL && REDIS_TOKEN);

async function redis(commands) {
  const r = await fetch(`${REDIS_URL}/pipeline`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${REDIS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands),
  });
  if (!r.ok) throw new Error('redis ' + r.status);
  return (await r.json()).map(x => x.result);
}

// ===== الباسورد =====
function checkPassword(req) {
  const real = process.env.ADMIN_PASSWORD || '';
  const given = String(req.headers['x-admin-key'] || '');
  if (real.length < 6) return false;              // لازم باسورد 6 حروف على الأقل
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

// ===== GitHub: قراءة وحفظ ملفات المتجر =====
const REPO = process.env.GITHUB_REPO || 'ali95858052-gif/mtuae-store';
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const gh = (path, opts = {}) => fetch(`https://api.github.com/repos/${REPO}/contents/${path}${opts.method ? '' : `?ref=${BRANCH}`}`, {
  ...opts,
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mtuae-store-admin',
    'Content-Type': 'application/json',
  },
});

async function readFile(path) {
  const r = await gh(path);
  if (r.status === 404) return { data: null, sha: null };
  if (!r.ok) throw new Error('github read ' + r.status);
  const j = await r.json();
  return { data: JSON.parse(Buffer.from(j.content, 'base64').toString('utf8')), sha: j.sha };
}

async function writeFile(path, text, sha, message) {
  const r = await gh(path, {
    method: 'PUT',
    body: JSON.stringify({ message, branch: BRANCH, sha: sha || undefined, content: Buffer.from(text, 'utf8').toString('base64') }),
  });
  if (r.status === 409 || r.status === 422) { const e = new Error('conflict'); e.code = 409; throw e; }
  if (!r.ok) throw new Error('github write ' + r.status);
  return (await r.json()).content.sha;
}

// ===== التحقق من البيانات قبل الحفظ =====
const CATS = ['ads', 'social', 'media', 'web'];
const clean = (v, max = 400) => {
  if (typeof v !== 'string') return '';
  const s = v.replace(/[<>]/g, '').trim();   // ممنوع أي كود HTML جوه النصوص
  return s.slice(0, max);
};

function validateProducts(list) {
  if (!Array.isArray(list) || list.length > 60) throw new Error('قائمة الخدمات مش سليمة');
  const ids = new Set();
  return list.map((p, i) => {
    const id = clean(p.id, 24).replace(/[^a-zA-Z0-9_-]/g, '');
    if (!id || ids.has(id)) throw new Error(`كود الخدمة رقم ${i + 1} مكرر أو فاضي`);
    ids.add(id);
    const name = clean(p.name, 80);
    if (!name) throw new Error(`الخدمة رقم ${i + 1} من غير اسم`);
    const price = Number(p.price);
    if (!Number.isFinite(price) || price < 0 || price > 1000000) throw new Error(`سعر "${name}" مش رقم سليم`);
    const out = { id, emoji: clean(p.emoji, 8) || '✨', name, desc: clean(p.desc, 300), price: Math.round(price * 100) / 100 };
    if (clean(p.per, 30)) out.per = clean(p.per, 30);
    if (clean(p.tag, 30)) out.tag = clean(p.tag, 30);
    out.type = p.type === 'digital' ? 'digital' : 'service';
    if (out.type === 'service') out.cat = CATS.includes(p.cat) ? p.cat : 'ads';
    if (Array.isArray(p.features)) { const f = p.features.map(x => clean(x, 160)).filter(Boolean).slice(0, 30); if (f.length) out.features = f; }
    if (p.hidden) out.hidden = true;
    return out;
  });
}

function validateSite(site) {
  if (!site || typeof site !== 'object') throw new Error('النصوص مش سليمة');
  const txt = (o, keys, max) => Object.fromEntries(keys.map(k => [k, clean((o || {})[k], max)]));
  return {
    hero: txt(site.hero, ['badge', 'title1', 'title2', 'sub', 'cta', 'quizCta'], 300),
    quizbar: txt(site.quizbar, ['title', 'sub', 'btn'], 200),
    sections: (Array.isArray(site.sections) ? site.sections : []).filter(s => CATS.includes(s.cat)).map(s => ({
      cat: s.cat, title: clean(s.title, 60), tagline: clean(s.tagline, 160),
      chips: (Array.isArray(s.chips) ? s.chips : []).slice(0, 6).map(c => {
        const o = { t: clean(c.t, 60), tip: clean(c.tip, 200) };
        if (clean(c.find, 80)) o.find = clean(c.find, 80);
        if (clean(c.go, 24)) o.go = clean(c.go, 24).replace(/[^a-zA-Z0-9_-]/g, '');
        if (c.hl) o.hl = true;
        return o;
      }).filter(c => c.t),
    })),
    trust: (Array.isArray(site.trust) ? site.trust : []).slice(0, 3).map(t => txt(t, ['title', 'sub', 'link'], 120)),
  };
}

// ملف المنتجات بنفس شكله (منتج في كل سطر) عشان يفضل سهل القراية على GitHub
const productsText = list => '[\n' + list.map(p => ' ' + JSON.stringify(p)).join(',\n') + '\n]\n';

const readBody = req => {
  if (req.body && typeof req.body === 'object') return req.body;
  try { return JSON.parse(req.body || '{}'); } catch (e) { return {}; }
};

module.exports = { redis, hasRedis, checkPassword, readFile, writeFile, validateProducts, validateSite, productsText, readBody };
