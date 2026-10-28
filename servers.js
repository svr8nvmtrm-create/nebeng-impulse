import { db } from './_lib.js';

// Daftar server aktif + jumlah stok tersedia
export default async function handler(req, res) {
  try {
    const servers = await db('servers?active=eq.true&select=id,name,description,price&order=id');
    const free = await db('stock?order_id=is.null&select=server_id');
    const count = {};
    free.forEach((s) => (count[s.server_id] = (count[s.server_id] || 0) + 1));
    res.json(servers.map((s) => ({ ...s, stock: count[s.id] || 0 })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
