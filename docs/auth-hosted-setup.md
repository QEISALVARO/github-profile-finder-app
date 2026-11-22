# Supabase Auth Hosted — Email, Recovery, dan Deep Link

Dokumen ini untuk project Supabase **hosted**. Konfigurasi di
`supabase/config.toml` hanya berlaku untuk stack lokal (`supabase start`);
project hosted **tidak** membaca file itu. Semua perubahan hosted harus
dilakukan di Supabase Dashboard atau management API resmi.

> Jangan pernah menaruh service role key, SMTP password, access token, atau
> secret OAuth di `EXPO_PUBLIC_*`, `.env.example`, dokumen, atau commit.

## 1. Status verifikasi terakhir

| Item | Status |
| --- | --- |
| Email confirmation lokal | Dikonfigurasi di `supabase/config.toml`; **belum dieksekusi** di environment ini (Docker/Supabase runtime tidak tersedia) |
| Email confirmation hosted | **Belum diverifikasi** pada dokumen ini |
| Reset password hosted | **Belum diverifikasi** pada dokumen ini |
| Tanggal verifikasi hosted | Belum ada |

Jangan menandai hosted sebagai “verified” sampai checklist bagian 7 dijalankan
pada project hosted dan hasilnya dicatat.

## 2. Local vs hosted

| Aspek | Lokal | Hosted |
| --- | --- | --- |
| Sumber konfigurasi | `supabase/config.toml` | Supabase Dashboard → Authentication |
| Site URL | `gitscope://auth/callback` | Harus diisi manual |
| Redirect URLs | `additional_redirect_urls` | Authentication → URL Configuration |
| Email confirmation | `[auth.email].enable_confirmations` | Authentication → Providers → Email |
| SMTP | Inbucket lokal | Authentication → Emails → SMTP Settings |
| Template email | Default CLI | Authentication → Emails → Templates |
| URL project | `http://127.0.0.1:54321` | `https://<SUPABASE_PROJECT_REF>.supabase.co` |

## 3. Checklist Dashboard hosted

Gunakan `<SUPABASE_PROJECT_REF>` dan `<APP_SCHEME>` (default: `gitscope`)
sebagai placeholder. Jangan menulis nilai credential nyata.

### 3.1 Email provider

- [ ] Authentication → Providers → **Email** aktif.
- [ ] **Confirm email** aktif. Konsekuensi: `signUp` tidak langsung membuat
      sesi; layar Register menampilkan “Cek email” dan tombol kirim ulang.
- [ ] Minimum password length minimal **8** (samakan dengan validasi UI).
- [ ] Bila Confirm email dimatikan: pahami bahwa signup langsung membuat sesi;
      adapter menyimpan sesi itu, tetapi ini bukan konfigurasi default yang
      diuji untuk produksi.

### 3.2 URL Configuration

- [ ] **Site URL** diarahkan ke aplikasi/web resmi, misalnya
      `https://app.example.com` atau `<APP_SCHEME>://auth/callback`.
- [ ] **Redirect URLs** memuat seluruh callback yang dipakai:

```text
<APP_SCHEME>://auth/callback
<APP_SCHEME>://auth/update-password
https://app.example.com/auth/callback
https://app.example.com/auth/update-password
http://localhost:8081/auth/callback
http://localhost:8081/auth/update-password
http://127.0.0.1:8081/auth/callback
http://127.0.0.1:8081/auth/update-password
exp://127.0.0.1:8081
```

- [ ] Expo Go/dev build: tambahkan URL `exp://` yang benar-benar dipakai dan
      set `EXPO_PUBLIC_AUTH_REDIRECT_URL` ke URL tersebut. Jangan memakai
      override `exp://` untuk build production.
- [ ] Android/iOS standalone memakai scheme di `app.json`; pastikan scheme
      tersebut juga terdaftar di Supabase hosted.
- [ ] Setelah mengubah allowlist, uji ulang login dan reset; redirect yang
      tidak terdaftar akan ditolak sebelum sampai ke aplikasi.

### 3.3 Provider OAuth hosted

- [ ] Authentication → Providers → **GitHub** aktif dengan Client ID/Secret
      dari GitHub **OAuth Apps** (bukan GitHub Apps).
- [ ] Scope GitHub minimal `read:user`; **jangan** meminta `user:email`
      (POL-2). `npm run oauth:check` akan memperingatkan bila scope hosted
      meminta email.
- [ ] Authentication → Providers → **Google** aktif bila tombol Google
      ditampilkan. Provider yang belum aktif membuat authorize ditolak 400.
- [ ] Authorization callback URL di GitHub OAuth App menunjuk ke
      `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`.
- [ ] Bila memakai penautan Google → GitHub, aktifkan **Allow manual linking**.

### 3.4 SMTP dan template email

- [ ] Authentication → Emails → SMTP Settings: isi host/port/user/password
      melalui Dashboard/secret manager. **Jangan** commit nilainya.
- [ ] Kirim email uji dari Dashboard.
- [ ] Template **Confirm signup** memakai `{{ .ConfirmationURL }}` dan
      mengarah ke callback aplikasi.
- [ ] Template **Reset password** memakai `{{ .ConfirmationURL }}` dan
      mengarah ke `/auth/update-password` (bukan hanya halaman login).
- [ ] Periksa folder spam; pastikan sender domain memiliki SPF/DKIM bila
      memakai domain sendiri.

## 4. Alur yang diharapkan

### Registrasi email

1. User mengisi email + password (minimal 8 karakter) di `/register`.
2. Supabase membuat user dan mengirim email konfirmasi.
3. UI menampilkan state “Cek email” + tombol kirim ulang.
4. User membuka tautan konfirmasi → callback aplikasi → onboarding.
5. Recruiter dapat menyelesaikan onboarding tanpa GitHub.

### Reset password

1. User meminta tautan di `/forgot-password`.
2. Supabase mengirim tautan dengan redirect ke
   `<APP_SCHEME>://auth/update-password` (web: `/auth/update-password`).
3. Deep link membawa `code` PKCE atau token implicit.
4. `/auth/update-password` menukar token menjadi sesi recovery.
5. User mengisi password baru + konfirmasi.
6. `updateUser({ password })` menyimpan password; sesi recovery diakhiri dan
   user diarahkan ke login.
7. Tautan kedaluwarsa/sudah dipakai/sesi hilang menampilkan pesan untuk minta
   tautan baru; token tidak ditampilkan dan tidak disimpan ke AsyncStorage.

## 5. Pemeriksaan konfigurasi tanpa secret

Jalankan:

```bash
npm run auth:check
```

Script memeriksa env wajib, format URL, konsistensi redirect, placeholder,
key `service_role` yang salah tempat, dan mode data production. Script tidak
mencetak token lengkap dan tidak membuktikan konfigurasi hosted.

`npm run auth:check -- --strict` memperlakukan peringatan sebagai kegagalan.

## 6. Uji manual hosted

Catat tanggal, project ref (bukan secret), dan hasil setiap langkah.

### A. User baru + konfirmasi email

- [ ] Daftar dengan email uji yang belum pernah dipakai.
- [ ] Pastikan UI menampilkan state cek inbox dan tidak masuk tabs.
- [ ] Buka tautan konfirmasi dari email.
- [ ] Pastikan aplikasi masuk ke onboarding, bukan Welcome/error.
- [ ] Selesaikan onboarding recruiter tanpa GitHub.
- [ ] Login ulang dengan password yang sama berhasil.
- [ ] Hapus user uji setelah selesai (Authentication → Users).

### B. Reset password

- [ ] Dari `/forgot-password`, minta tautan untuk user uji.
- [ ] Buka tautan; pastikan layar password baru terbuka, bukan tabs.
- [ ] Coba password < 8 karakter dan konfirmasi berbeda; pastikan ditolak.
- [ ] Simpan password baru; pastikan sukses lalu diarahkan ke login.
- [ ] Login dengan password lama gagal; password baru berhasil.
- [ ] Buka kembali tautan yang sama; pastikan pesan kedaluwarsa/sudah dipakai.
- [ ] Buka `/auth/update-password` tanpa token dari sesi login biasa;
      pastikan form tidak terbuka.

### C. Batalkan sesi & bersihkan data uji

- [ ] Logout dari aplikasi dan hapus sesi di perangkat uji.
- [ ] Hapus user uji di Dashboard, atau gunakan endpoint admin dari server
      dengan service role (jangan dari aplikasi klien).
- [ ] Hapus email uji dari inbox/SMTP log bila berisi tautan sensitif.
- [ ] Jangan menyimpan token/screenshot berisi token di repository.

## 7. Hasil verifikasi hosted

Isi hanya setelah checklist dijalankan:

```text
Tanggal:
Project ref:
Confirmation email: PASS/FAIL + catatan
Reset password: PASS/FAIL + catatan
Platform yang diuji:
Catatan kegagalan:
```

Sampai bagian ini terisi, status hosted adalah **belum terverifikasi**.

## 8. Troubleshooting

- **Redirect URL not allowed**: tambahkan URL persis (termasuk scheme/path)
  ke Redirect URLs hosted.
- **Tautan recovery membuka tabs**: pastikan template reset mengarah ke
  `/auth/update-password` dan route itu terdaftar di aplikasi.
- **Email tidak datang**: cek SMTP, spam, rate limit, dan status user di
  Authentication → Users.
- **`Email not confirmed` saat login**: konfirmasi email aktif; minta kirim
  ulang dari layar Register.
- **Reset selalu “kedaluwarsa”**: tautan sekali pakai; minta tautan baru dan
  pastikan waktu perangkat/server benar.
