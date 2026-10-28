import bcrypt from 'bcryptjs';
import { db, signToken } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email & password wajib diisi' });

    const mail = String(email).trim().toLowerCase();
    const [user] = await db(`users?email=eq.${encodeURIComponent(mail)}&select=*`);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ error: 'Email atau password salah' });

    res.json({ token: signToken(user), user: { name: user.name, email: user.email } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
