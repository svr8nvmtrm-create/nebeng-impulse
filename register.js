import bcrypt from 'bcryptjs';
import { db, signToken } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'Semua field wajib diisi' });
    if (password.length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' });

    const mail = String(email).trim().toLowerCase();
    const exist = await db(`users?email=eq.${encodeURIComponent(mail)}&select=id`);
    if (exist.length) return res.status(400).json({ error: 'Email sudah terdaftar' });

    const password_hash = await bcrypt.hash(password, 10);
    const [user] = await db('users', { method: 'POST', body: { name: String(name).trim(), email: mail, password_hash } });
    res.json({ token: signToken(user), user: { name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
