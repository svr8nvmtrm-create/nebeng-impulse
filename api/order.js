import crypto from 'crypto';
import { db, getUser } from './_lib.js';

// Buat order + transaksi QRIS di Tripay
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Silakan login dulu' });

  try {
    const { server_id } = req.body || {};
    const [server] = await db(`servers?id=eq.${Number(server_id)}&active=eq.true&select=*`);
    if (!server) return res.status(404).json({ error: 'Server tidak ditemukan' });

    const free = await db(`stock?server_id=eq.${server.id}&order_id=is.null&select=id&limit=1`);
    if (!free.length) return res.status(400).json({ error: 'Stok server habis' });

    const [order] = await db('orders', {
      method: 'POST',
      body: { user_id: user.id, server_id: server.id, amount: server.price }
    });

    const merchantCode = process.env.TRIPAY_MERCHANT_CODE;
    const signature = crypto
      .createHmac('sha256', process.env.TRIPAY_PRIVATE_KEY)
      .update(merchantCode + order.id + server.price)
      .digest('hex');

    const r = await fetch(`${process.env.TRIPAY_BASE}/transaction/create`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.TRIPAY_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'QRIS',
        merchant_ref: order.id,
        amount: server.price,
        customer_name: user.name,
        customer_email: user.email,
        order_items: [{ name: server.name, price: server.price, quantity: 1 }],
        expired_time: Math.floor(Date.now() / 1000) + 30 * 60,
        signature
      })
    });
    const j = await r.json();
    if (!j.success) {
      await db(`orders?id=eq.${order.id}`, { method: 'PATCH', body: { status: 'failed' } });
      return res.status(502).json({ error: j.message || 'Gagal membuat pembayaran' });
    }

    const qr_url = j.data.qr_url || j.data.pay_url;
    await db(`orders?id=eq.${order.id}`, {
      method: 'PATCH',
      body: { qr_url, reference: j.data.reference }
    });

    res.json({ order_id: order.id, amount: server.price, qr_url, checkout_url: j.data.checkout_url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
