import { db, getUser } from './_lib.js';

// Riwayat order milik user yang login (akun muncul di sini setelah dibayar)
export default async function handler(req, res) {
  const user = getUser(req);
  if (!user) return res.status(401).json({ error: 'Silakan login dulu' });
  try {
    const rows = await db(
      `orders?user_id=eq.${user.id}&select=id,amount,status,qr_url,account_text,created_at,servers(name)&order=created_at.desc&limit=50`
    );
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
