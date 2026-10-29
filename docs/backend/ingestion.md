# Dokumentasi Ingestion GitHub (`analyze-developer`)

Dokumentasi arsitektur, alur data, kuota, mitigasi SSRF, dan panduan penggunaan Edge Function `analyze-developer` (Fase BE-2).

---

## 1. Menjalankan Edge Function di Lingkungan Lokal

Edge Function dapat disajikan secara lokal menggunakan Supabase CLI:

```bash
# Sajikan seluruh Edge Functions dengan membaca variabel lingkungan lokal
npx supabase functions serve --env-file .env

# Atau menyajikan fungsi analyze-developer secara spesifik
npx supabase functions serve analyze-developer --env-file .env
```

Pastikan variabel `GITHUB_API_TOKEN` telah terisi di `.env` lokal:
```env
GITHUB_API_TOKEN=ghp_your_personal_access_token_here
```

---

## 2. Contoh Pemanggilan API (`curl`)

Endpoint: `POST /functions/v1/analyze-developer`

### A. Permintaan Normal (Membaca Cache jika Tersedia)
```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/analyze-developer" \
  -H "Authorization: Bearer <JWT_USER>" \
  -H "Content-Type: application/json" \
  -d '{"login": "octocat"}'
```

### B. Permintaan Paksa Segar (`force: true`)
```bash
curl -X POST "http://127.0.0.1:54321/functions/v1/analyze-developer" \
  -H "Authorization: Bearer <JWT_USER>" \
  -H "Content-Type: application/json" \
  -d '{"login": "octocat", "force": true}'
```
*Catatan:* Sesuai spesifikasi, opsi `force: true` hanya akan memicu fetch ulang jika data di database telah berusia lebih dari **15 menit**. Jika usia analisis masih di bawah 15 menit, server akan mengembalikan hasil cache demi menghemat kuota GitHub API.

---

## 3. Matriks Respons & Kode Error (`ErrorBody`)

Format respons kegagalan selalu mematuhi skema kontrak SP-0 `ErrorBody`:
```json
{
  "code": "RATE_LIMITED",
  "message": "Batas frekuensi permintaan analisis terlampaui. Coba lagi dalam 45 detik.",
  "retry_after": 45
}
```

| Status HTTP | Kode Error (`code`) | Kondisi |
|---|---|---|
| `400` | `VALIDATION` | Format username tidak valid (panjang > 39, mengandung double hyphen, atau berawalan/berakhiran tanda hubung) |
| `401` | `UNAUTHORIZED` | Header `Authorization` hilang, token JWT tidak valid, atau kedaluwarsa |
| `403` | `FORBIDDEN` | Pengguna bukan rekruter dan mencoba menganalisis username milik orang lain (AIR-3) |
| `404` | `NOT_FOUND` | Pengguna GitHub tidak ditemukan di server hulu |
| `429` | `RATE_LIMITED` | Batas rate limit pengguna tercapai (30 request/jam) ATAU batas kuota GitHub API terlampaui |
| `502` | `UPSTREAM_ERROR` | Layanan GitHub API mengalami gangguan dan tidak ada data analisis lama di database |

---

## 4. Kebijakan Cache & Retensi Data (POL-5)

1. **TTL Analisis Segar:**
   - **Developer Terdaftar (`listed = true`):** TTL cache **12 jam**.
   - **Lookup Pengguna Luar / Unlisted:** TTL cache **24 jam**.
2. **Penanganan Kegagalan Hulu (Stale-on-Error):**
   - Jika GitHub mengalami gangguan (403, 429, 5xx, timeout, atau jaringan putus), namun di database **sudah pernah ada** rekaman analisis sebelumnya, sistem mengembalikan data tersebut dengan status `source: "stale"` dan field `staleSince: <timestamp_analisis_lama>`.
   - **Prinsip Kritis:** Sistem **DILARANG KERAS** menyajikan data rekaan / buatan sendiri saat upstream gagal.
3. **Pembersihan Kedaluwarsa (POL-5):**
   - Lookup non-terdaftar memiliki `expires_at`: 24 jam untuk `github_snapshots` dan 7 hari untuk `analyses`.
   - Developer terdaftar berstatus `listed=true` memiliki `expires_at = NULL` (tidak dihapus).
   - Fungsi `purge_expired_lookups()` membersihkan snapshot/analisis yang kedaluwarsa secara berkala.

---

## 5. Mitigasi SSRF pada Verifikasi Demo

Untuk setiap `homepageUrl` dari repositori non-fork, server melakukan verifikasi HTTP (HEAD lalu fallback GET) dengan perlindungan:
- Hanya protokol `http:` dan `https:` pada port standar (`80` dan `443`).
- Dilarang mengandung kredensial (`user:pass@host`).
- Deteksi IP privat, loopback (`127.0.0.0/8`, `::1`), link-local (`169.254.0.0/16` termasuk AWS metadata `169.254.169.254`), CGNAT (`100.64.0.0/10`), dan alamat IPv6 ULA/multicast.
- Resolusi DNS runtime: Setiap IP hasil resolusi hostname divalidasi ulang sebelum soket dibuka.
- Validasi berulang pada setiap alur *redirect* (maksimal 3 *redirects*).
- Batas waktu koneksi ketat: **5 detik**.

---

## 6. Temuan Spike Teknis

1. **PAT vs GitHub App:**
   - **PAT (Personal Access Token):** Memiliki batas kuota 5.000 request per jam per token dan dapat membaca seluruh profil publik, repositori publik, serta kalender kontribusi user sembarang.
   - **GitHub App:** Menghasilkan installation token (berumur 1 jam). Installation token untuk akun instalan organisasi dapat membaca repositori publik organisasi, namun akses ke `contributionsCollection` user publik sembarang bisa bervariasi bergantung pada relasi instalasi. Oleh karena itu, PAT dipasang sebagai **default runtime**, sementara arsitektur GitHub App disediakan sebagai kerangka kerja modular (`GITHUB_AUTH_MODE=pat|app`).
2. **Conditional Request / ETag:**
   - Pemanggilan REST API dengan ETag (`If-None-Match`) mengembalikan status `304 Not Modified`, namun pada API terautentikasi kuota tetap dapat terhitung sebesar 1 request. Karenanya, kueri GraphQL dijadikan jalur utama ekstraksi fakta karena 1 kueri GraphQL dapat menggabungkan profil, repositori, dan kalender kontribusi dalam satu panggilan (biaya kuota aktual per kueri dicatat oleh `live-bench` dari `rateLimit.cost`).

---

## 7. Hasil Uji Live & Performa

> **BELUM DIUKUR** — tabel di bawah menunggu hasil `scripts/backend/live-bench.ts`
> (butuh `GITHUB_API_TOKEN` + Supabase lokal; tidak tersedia di lingkungan ini).
> Jangan mengisi angka sebelum berkas bukti ada di `docs/backend/evidence/`.

Target performa: **p95 analisis segar < 6 detik**.

| Kasus Uji | Profil | Jumlah Repo | Durasi (ms) | Biaya GraphQL | Status Source |
|---|---|---|---|---|---|
| BELUM DIUKUR | - | - | - | - (catat cost Q1-Q4 per kueri) | - |

Cara mengukur: `make up && make reset`, isi `GITHUB_API_TOKEN`, lalu jalankan bench
(lihat header `scripts/backend/live-bench.ts`); salin median/p95 dari berkas
`docs/backend/evidence/ingestion-live-<tanggal>.json` ke tabel ini beserta
tautan berkasnya. Klaim "1 poin per kueri" dan "hemat N%" hanya boleh ditulis
bila `rateLimit.cost` per kueri tercatat di berkas bukti.
