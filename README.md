# Nebeng Impulse – Web Jualan Akun Otomatis (QRIS)

Web toko akun otomatis: user daftar → pilih server → bayar QRIS (Tripay) → akun muncul otomatis di **Riwayat**.

**Stack (semua gratis untuk mulai):** HTML/JS biasa · Vercel (hosting + API) · Supabase (database) · Tripay (QRIS)

```
nebeng-impulse/
├── public/index.html     ← tampilan web (mobile-first)
├── api/
│   ├── _lib.js           ← helper database & login token
│   ├── register.js       ← POST daftar
│   ├── login.js          ← POST masuk
│   ├── servers.js        ← GET daftar server + stok
│   ├── order.js          ← POST buat order + QRIS
│   ├── callback.js       ← POST dipanggil Tripay saat dibayar
│   └── orders.js         ← GET riwayat user
├── supabase.sql          ← struktur database
├── package.json
├── vercel.json
└── .env.example
```

---

## Langkah 1 – Siapkan alat
1. Install **Node.js** (nodejs.org, versi LTS).
2. Buat akun gratis di: **github.com**, **supabase.com**, **vercel.com**, **tripay.co.id**.

## Langkah 2 – Database (Supabase)
1. Supabase → **New project** (catat password database).
2. Buka **SQL Editor → New query** → copy seluruh isi `supabase.sql` → **Run**.
3. Buka **Project Settings → API**, catat:
   - `Project URL` → untuk `SUPABASE_URL`
   - `service_role` key → untuk `SUPABASE_SERVICE_KEY` (**rahasia, jangan dibagikan**)

## Langkah 3 – Pembayaran (Tripay)
1. Daftar & login Tripay → mulai dari **mode Sandbox** (testing).
2. Menu **Merchant** → buat merchant → catat **Kode Merchant**.
3. Menu **Merchant → Opsi / API** → catat **API Key** dan **Private Key**.
4. Pastikan channel **QRIS** aktif.
5. Callback URL diisi **setelah deploy** (Langkah 6).

## Langkah 4 – Upload ke GitHub
```bash
cd nebeng-impulse
git init
git add .
git commit -m "first commit"
# buat repo kosong di github.com lalu:
git remote add origin https://github.com/USERNAME/nebeng-impulse.git
git branch -M main
git push -u origin main
```
> Pastikan file `.env` (kalau kamu buat) **tidak** ikut di-upload.

## Langkah 5 – Deploy di Vercel
1. Vercel → **Add New → Project** → import repo `nebeng-impulse`.
2. Sebelum klik Deploy, buka **Environment Variables**, isi semua dari `.env.example`:

| Nama | Isi |
|---|---|
| `SUPABASE_URL` | URL project Supabase |
| `SUPABASE_SERVICE_KEY` | service_role key |
| `JWT_SECRET` | teks acak panjang buatan kamu |
| `TRIPAY_BASE` | `https://tripay.co.id/api-sandbox` (testing) / `https://tripay.co.id/api` (live) |
| `TRIPAY_API_KEY` | API key Tripay |
| `TRIPAY_PRIVATE_KEY` | private key Tripay |
| `TRIPAY_MERCHANT_CODE` | kode merchant |

3. Klik **Deploy**. Hasilnya: `https://nama-project.vercel.app`.

## Langkah 6 – Pasang Callback Tripay
Di dashboard Tripay → **Merchant → Callback URL**, isi:
```
https://nama-project.vercel.app/api/callback
```
Inilah yang membuat akun terkirim **otomatis** setelah pembayaran masuk.

## Langkah 7 – Tes
1. Buka web → **Daftar** → **Lihat Server** → **Beli**.
2. Di sandbox Tripay, simulasikan pembayaran dari dashboard (menu Transaksi → Simulator).
3. Cek **Riwayat**: akun muncul otomatis.

## Langkah 8 – Isi stok akun asli
Supabase → **Table Editor → stock → Insert row**:
- `server_id` = id server
- `account_text` = isi akun yang akan diterima pembeli (boleh multi-baris)

Tambah server baru di tabel `servers` (`name`, `description`, `price`).
Hapus data contoh (demo1/demo2/demo3) sebelum live.

## Langkah 9 – Go live
1. Ubah `TRIPAY_BASE` ke `https://tripay.co.id/api`, dan ganti API key/private key/merchant code ke versi **production**.
2. Redeploy di Vercel (Deployments → Redeploy).
3. Opsional: pasang domain sendiri di Vercel → Settings → Domains.
4. Ganti nomor WhatsApp admin di `public/index.html` (cari `wa.me/6281234567890`).

---

## Cara kerja otomatis
1. `order.js` membuat order `pending` + transaksi QRIS Tripay.
2. User bayar → Tripay memanggil `callback.js` (signature diverifikasi HMAC).
3. `callback.js` memanggil fungsi SQL `claim_stock` yang mengambil 1 akun secara atomik (anti jual dobel), lalu status order jadi `paid`.
4. Halaman Riwayat menampilkan akun.

## Troubleshooting
- **"Gagal membuat pembayaran"** → cek API key/private key/merchant code, pastikan QRIS aktif & `TRIPAY_BASE` sesuai mode.
- **Sudah bayar tapi akun tidak muncul** → cek Callback URL Tripay & log di Vercel → Logs.
- **Status `paid_nostock`** → stok habis saat pembayaran masuk; tambah stok lalu kirim manual / ubah di tabel `orders`.
- **Error 500 di API** → biasanya Environment Variables belum diisi / belum redeploy setelah mengisi.

## Catatan keamanan
- Jangan pernah menaruh `SUPABASE_SERVICE_KEY` / private key Tripay di `index.html`.
- Gunakan web ini hanya untuk produk/akun yang sah dan sesuai aturan layanan penyedia.
