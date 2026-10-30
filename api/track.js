// بيسجّل حركة الزوار في المتجر (زيارة، فتح تفاصيل، طلب واتساب، الأسئلة) للوحة التحكم
const L = require('./_lib');

const EVENTS = ['visit', 'details', 'order', 'ask', 'contact', 'quiz_start', 'quiz_done', 'quiz_order'];
const LEADS = ['order', 'quiz_order', 'ask', 'contact'];   // دول بيظهروا في "آخر الطلبات"

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  if (!L.hasRedis()) return res.status(204).end();   // الإحصائيات مش متفعّلة لسه
  const b = L.readBody(req);
  const ev = String(b.ev || '');
  if (!EVENTS.includes(ev)) return res.status(400).end();
  const id = String(b.id || '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  const short = v => String(v || '').replace(/[<>]/g, '').slice(0, 40);

  const day = 'st:' + new Date(Date.now() + 4 * 3600e3).toISOString().slice(0, 10);   // بتوقيت الإمارات
  const cmds = [['HINCRBY', day, ev, 1], ['EXPIRE', day, 60 * 60 * 24 * 120]];
  if (id) cmds.push(['HINCRBY', day, ev + ':' + id, 1]);
  if (b.biz) cmds.push(['HINCRBY', day, 'biz:' + short(b.biz), 1]);
  if (LEADS.includes(ev)) {
    cmds.push(['LPUSH', 'recent', JSON.stringify({ t: Date.now(), ev, id, biz: short(b.biz), src: short(b.src) })]);
    cmds.push(['LTRIM', 'recent', 0, 99]);
  }
  try { await L.redis(cmds); } catch (e) {}
  res.status(204).end();
};
