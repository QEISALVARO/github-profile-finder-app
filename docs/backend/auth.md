# Dokumentasi Otentikasi & Manajemen Profil (BE-1)

Dokumentasi alur otentikasi GitHub OAuth, pendaftaran, onboarding dua peran (Developer & Recruiter), serta API penghapusan akun.

---

## 1. Konfigurasi GitHub OAuth Provider

Gitscope menggunakan GitHub OAuth sebagai metode login utama. Sesuai kebijakan privasi **POL-2**, Gitscope hanya meminta cakupan akses minimal dan tidak menyimpan atau meminta email pengguna.

### Parameter OAuth
- **Scope**: `read:user` (tanpa scope `user:email`)
- **Redirect URIs**:
  - Aplikasi Seluler (Deep Link): `gitscope://auth/callback`
  - Lingkungan Pengujian Lokal: `http://127.0.0.1:54321/auth/v1/callback`

### Langkah Pendaftaran GitHub OAuth App
1. Buka [GitHub Developer Settings -> OAuth Apps](https://github.com/settings/developers).
2. Buat aplikasi baru:
   - **Application name**: Gitscope (Local Dev)
   - **Homepage URL**: `http://localhost:54321`
   - **Authorization callback URL**: `http://127.0.0.1:54321/auth/v1/callback`
3. Salin **Client ID** dan hasilkan **Client Secret**.
4. Masukkan ke file `.env` lokal:
   ```env
   GITHUB_CLIENT_ID=ov23...
   GITHUB_CLIENT_SECRET=...
   ```
5. **Penting:** Jangan pernah meng-commit kredensial ini ke repository git.

---

## 2. Trigger Otomatis Pembuatan Profil (`handle_new_github_user`)

Saat pengguna pertama kali login melalui GitHub OAuth, trigger database di `auth.users` secara otomatis mengeksekusi fungsi `public.handle_new_github_user()`:
- Mengekstrak data metadata GitHub: `login` / `user_name`, `name`, `avatar_url`, `github_id`, serta `location_text` (jika ada).
- Menjalankan fungsi normalisasi lokasi awal `normalize_location(location_raw)`.
- Jika lokasi berhasil dinormalisasi dengan confidence cukup tinggi, disimpan dengan `country_source = 'inferred'`.
- Status `roles` diinisialisasi kosong `roles = '{}'`.
- Akun tetap dalam status belum terdaftar di feed publik (`listed = false`) hingga onboarding diselesaikan.

---

## 3. Remote Procedure Calls (RPC) untuk Onboarding & Profil

Semua RPC menggunakan hak akses `SECURITY INVOKER` dengan validasi ketat identitas `auth.uid()`:

### A. `complete_onboarding(...)`
Menyelesaikan alur onboarding awal setelah login pertama kali.
- **Parameter**:
  - `p_roles`: `user_role[]` (berisi `'developer'`, `'recruiter'`, atau keduanya).
  - `p_country_code`: `char(2)` (opsional jika recruiter murni, wajib untuk developer listing).
  - `p_city`: `text` (opsional).
  - `p_company`: `text` (**wajib** jika memilih peran `'recruiter'`).
  - `p_title`: `text` (jabatan rekruter).
  - `p_target_countries`: `char(2)[]` (daftar negara sasaran rekrutmen).
- **Perilaku**:
  - Jika peran `developer` dipilih dan negara diisi, `country_source` diatur menjadi `'self'` dengan `country_confidence = 100`.
  - Jika peran `recruiter` dipilih tanpa mengisi nama perusahaan, transaksi ditolak dengan error terstruktur.

### B. `set_country(p_country_code, p_city)`
Memperbarui negara dan kota secara eksplisit oleh pengguna (`country_source = 'self'`, `confidence = 100`).

### C. `update_developer_settings(p_listed, p_open_to_messages, p_availability, p_headline)`
Memperbarui preferensi keterlihatan developer. Jika mencoba menyetel `p_listed = true` sementara negara belum pernah terisi, trigger POL-9 akan menolak dengan error `POL9_COUNTRY_REQUIRED`.

### D. `update_recruiter_profile(p_company, p_title, p_hiring_status, p_target_countries)`
Memperbarui informasi profil rekruter dan kriteria target pencarian bakat.

---

## 4. Edge Function `delete-account` (Hak Penghapusan Akun / POL-8)

- **Endpoint**: `POST /functions/v1/delete-account`
- **Autentikasi**: Header `Authorization: Bearer <jwt_pengguna>`
- **Perilaku**:
  1. Memvalidasi JWT pengguna aktif.
  2. Menghapus pesan dan percakapan (`messages`, `conversations`).
  3. Menghapus entri pipeline, token notifikasi, blokir, dan laporan pelecehan.
  4. Menghapus proyek dan pengaturan pengembang/rekruter.
  5. Menghapus rekaman profil publik.
  6. Memanggil `auth.admin.deleteUser(user_id)` untuk mencabut seluruh sesi dan menghapus kredensial autentikasi.
- **Format Respons Error**:
  Mengembalikan skema `ErrorBody` yang disepakati:
  ```json
  {
    "code": "UNAUTHORIZED",
    "message": "Token autentikasi tidak valid atau sudah kedaluwarsa"
  }
  ```
