import crypto from 'crypto';
import { db, rpc } from './_lib.js';

// Vercel: kita butuh raw body untuk verifikasi signature
export const config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Callback otomatis dari Tripay saat pembayaran masuk
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ success: false });
  try {
    const raw = await readRaw(req);
    const expected = crypto.createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY).update(raw).digest('hex');
    if (req.headers['x-callback-signature'] !== expected)
      return res.status(403).json({ success: false, message: 'Invalid signature' });

    if (req.headers['x-callback-event'] !== 'payment_status') return res.json({ success: true });

    const data = JSON.parse(raw);
    const [order] = await db(`orders?id=eq.${data.merchant_ref}&select=*`);
    if (!order) return res.json({ success: false, message: 'Order not found' });
    if (order.status !== 'pending') return res.json({ success: true }); // sudah diproses

    if (data.status === 'PAID') {
      const account = await rpc('claim_stock', { p_server: order.server_id, p_order: order.id });
      await db(`orders?id=eq.${order.id}`, {
        method: 'PATCH',
        body: account ? { status: 'paid', account_text: account } : { status: 'paid_nostock' }
      });
    } else if (['EXPIRED', 'FAILED', 'REFUND'].includes(data.status)) {
      await db(`orders?id=eq.${order.id}`, { method: 'PATCH', body: { status: 'failed' } });
    }
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}
