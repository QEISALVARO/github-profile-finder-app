# GitHub OAuth di APK — setup lengkap

Dokumen ini menyalakan **login GitHub asli** (Supabase OAuth, scope `read:user`)
untuk build Android/iOS, termasuk APK dari EAS Build.

Tanpa konfigurasi ini aplikasi tetap jalan: tombol *Continue with GitHub* jatuh
ke **sesi demo lokal** (`octocat`) supaya onboarding bisa dicoba.

Login Google dan kewajiban menautkan GitHub sebelum onboarding dijelaskan di
[`auth-google-github-link.md`](./auth-google-github-link.md).

---

## Ringkasan alur

```
[App] signInWithOAuth (PKCE) ──▶ [Browser] GitHub consent
                                        │
                                        ▼
                             https://<ref>.supabase.co/auth/v1/callback
                                        │
                                        ▼
                    gitscope://auth/callback?code=…  (deep link)
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
        promise openAuthSessionAsync            route src/app/auth/callback.tsx
        (app masih hidup)                        (app di-kill saat browser terbuka)
                    └───────── exchangeCodeForSession(code) ─────────┘
                                        │
                                        ▼
                     onAuthStateChange → useAuthStore → guard root
```

Kode terkait:

| File | Peran |
| --- | --- |
| `src/lib/auth.ts` | probe authorize (deteksi 404 Client ID), buka browser, tukar `code` PKCE, cache anti-double-exchange; teks error ada di `AUTH_SETUP_MESSAGES` |
| `src/app/auth/callback.tsx` | jalur deep link saat app dibuka dingin |
| `src/lib/supabase.ts` | klien Supabase lazy, `flowType: 'pkce'` |
| `src/app/welcome.tsx` | CTA + fallback demo bila backend belum dikonfigurasi |
| `eas.json` | profile `preview`/`production` → environment EAS yang sesuai |

---

## Kalau berhenti di halaman 404 GitHub

Halaman **"404 — Didn't find anything here!"** adalah halaman github.com, bukan
layar aplikasi. Artinya GitHub tidak mengenali permintaan authorize, jadi
tidak pernah ada redirect balik berisi `code`. Tiga setelan yang harus
dipisahkan (jangan tertukar):

| Gejala | Yang salah | Perbaikan |
| --- | --- | --- |
| 404 di github.com setelah menekan tombol | Client ID tidak dikenal GitHub | Client ID harus dari tab **OAuth Apps**, bukan **GitHub Apps** (langkah 2) |
| Halaman GitHub "redirect_uri MUST match…" | Authorization callback URL di OAuth App | Isi `https://<PROJECT_REF>.supabase.co/auth/v1/callback` (langkah 2) |
| Balik ke app dengan pesan "Redirect URL belum diizinkan…" | `redirect_to` app belum ada di allowlist Supabase | Langkah 4 |

Aplikasi sekarang memeriksa URL authorize ke GitHub sebelum membuka browser:
bila GitHub membalas 404, tombol langsung menampilkan pesan Client ID/OAuth App
(`AUTH_SETUP_MESSAGES.githubClientId` di `src/lib/auth.ts`) tanpa menampilkan
halaman 404.

---

## 1. Buat project Supabase (hosted)

Pilih salah satu:

**A. Otomatis lewat Expo (paling singkat)**

```bash
npx eas-cli@latest integrations:supabase:connect
```

Perintah ini membuat project, menulis `EXPO_PUBLIC_SUPABASE_URL` +
`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ke Expo Services environment variables
(`development`, `preview`, `production`), dan membuat `.env.local`.

> Perintah yang sama juga memasang `expo-sqlite` dan menambahkan config
> plugin-nya. Proyek ini menyimpan sesi lewat `AsyncStorage` di
> `src/lib/supabase.ts`, jadi plugin itu tidak dipakai — pilih **B** bila tidak
> ingin dependencies ikut berubah.

**B. Manual**

1. Buat project di <https://database.new>.
2. Catat **Project URL** dan **Publishable key** (atau anon key) dari
   *Project Settings → API*.
3. Simpan untuk langkah 5.

> Kunci publishable/anon **boleh** ikut di bundle aplikasi — keamanan data
> dijaga RLS. Jangan pernah memakai `service_role`/secret key di app.

---

## 2. Buat GitHub OAuth App

> **Penting:** di <https://github.com/settings/developers> ada dua tab,
> **OAuth Apps** dan **GitHub Apps**. Supabase memanggil
> `github.com/login/oauth/authorize`, yang hanya mengenal **OAuth App**. Client
> ID dari tab *GitHub Apps* menghasilkan halaman **404** persis seperti
> screenshot. Pastikan yang dibuka tab **OAuth Apps** → **New OAuth App**.

Paling aman: ambil dulu nilai callback yang benar dari dashboard.

1. Supabase Dashboard → **Authentication** → **Sign In / Providers** →
   **GitHub** → salin **Callback URL** yang tertulis di situ (bentuknya
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`).
2. Buka <https://github.com/settings/developers> → tab **OAuth Apps** →
   **New OAuth App**.
3. Isi:
   - **Application name**: `gitscope`
   - **Homepage URL**: bebas, mis. `https://github.com/<user>/gitscope`
   - **Authorization callback URL**: tempel hasil langkah 1 (**bukan**
     `gitscope://auth/callback`)
   - **Enable Device Flow**: biarkan mati
4. **Register application**, lalu **Generate a new client secret**.
5. Catat **Client ID** dan **Client secret** dari app itu (halaman OAuth App
   menampilkan *Client ID* + *Client secrets*; GitHub App menampilkan *App ID*).

> Callback URL GitHub **selalu** mengarah ke Supabase, bukan ke `gitscope://`.
> Deep link `gitscope://…` baru dipakai setelah Supabase selesai memproses.
> Lokal (`supabase start`): callback-nya
> `http://127.0.0.1:54321/auth/v1/callback` (lihat `.env.example`).

---

## 3. Aktifkan provider GitHub di Supabase

Supabase Dashboard → **Authentication → Sign In / Providers → GitHub**:

- Enable provider.
- Tempel **Client ID** dan **Client Secret** dari OAuth App langkah 2 (keduanya
  harus dari app yang sama).
- Simpan, lalu tutup semua tab lama sebelum mencoba lagi — URL authorize dibuat
  ulang setiap kali tombol ditekan.

---

## 4. Izinkan redirect URL kembali ke app

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (hanya fallback; app selalu mengirim
  `redirect_to` eksplisit).
- **Redirect URLs** (*Additional Redirect URLs*) — tambahkan **keduanya**:
  ```
  gitscope://auth/callback
  gitscope://**
  ```

`gitscope` adalah `expo.scheme` di `app.json`. Jangan mengganti scheme tanpa
memperbarui daftar ini.

---

## 5. Set environment di EAS (bukan `.env`)

File `.env` **tidak ikut** ke cloud build (gitignored), jadi APK dari CI wajib
memakai Expo Services environment variables.

```bash
# Ganti <PROJECT_REF> dan <KEY> dengan nilai project kamu.
npx eas-cli@latest env:set \
  --name EXPO_PUBLIC_SUPABASE_URL \
  --value "https://<PROJECT_REF>.supabase.co" \
  --environment preview --environment production \
  --visibility plaintext

npx eas-cli@latest env:set \
  --name EXPO_PUBLIC_SUPABASE_ANON_KEY \
  --value "<PUBLISHABLE_OR_ANON_KEY>" \
  --environment preview --environment production \
  --visibility plaintext

# Wajib: getSupabase() hanya dibuat bila minimal satu domain berflag `api`.
npx eas-cli@latest env:set \
  --name EXPO_PUBLIC_DS_AUTH \
  --value api \
  --environment preview --environment production \
  --visibility plaintext
```

`EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` juga didukung (nama baru Supabase).
Isi salah satu saja.

Verifikasi:

```bash
npx eas-cli@latest env:list --environment preview
```

`eas.json` sudah memakai `environment: "preview"` / `"production"` secara
eksplisit, jadi `eas build --profile preview` membaca set yang benar.

**Lokal (development):** isi `.env` dengan URL project hosted + key yang sama,
lalu:

```bash
npx expo start
```

Jika menguji di HP dengan Supabase **lokal**, jangan pakai `127.0.0.1` — ganti
dengan IP LAN komputer (`http://192.168.x.x:54321`).

---

## 6. Build & uji

```bash
npx eas-cli@latest build --platform android --profile preview
```

Alur yang benar saat menekan *Continue with GitHub*:

1. Tombol berubah menjadi **"Menghubungkan…"**.
2. Browser (Chrome Custom Tab / Safari) terbuka di halaman GitHub.
3. Setujui akses → browser tertutup sendiri.
4. App masuk ke onboarding / tabs dengan akun GitHub asli (bukan `octocat`).

Cek cepat sesi: buka Profile — login harus username GitHub kamu.

---

## Cek konfigurasi sebelum build

```bash
npm run oauth:check                 # cek statis + probe ke Supabase
npm run oauth:check -- --offline     # tanpa jaringan (CI)
npm run oauth:check -- --strict      # peringatan ikut menggagalkan exit code
```

`scripts/check-oauth-config.mjs` melaporkan item **OK / WARN / GAGAL**:

- **Deep link**: `expo.scheme` di `app.json`, `EXPO_PUBLIC_AUTH_REDIRECT_URL`,
  dan keberadaan route `app/auth/callback.tsx`.
- **Environment**: `EXPO_PUBLIC_SUPABASE_URL`, anon/publishable key, flag
  `EXPO_PUBLIC_DS_AUTH=api`, serta secret provider untuk `supabase start`.
- **`supabase/config.toml`**: `site_url`, `additional_redirect_urls`,
  `enable_manual_linking`, dan env Client ID yang dirujuk tiap provider.
- **Probe online** (default): memanggil `/auth/v1/authorize` dengan
  `redirect_to` = deep link app, lalu memeriksa hasil redirect Supabase —
  Client ID terpasang, `redirect_uri` menunjuk ke callback Supabase, redirect
  allowlist menerima deep link, dan scope GitHub (termasuk deteksi
  `user:email` yang melanggar POL-2).

Exit code `1` bila ada GAGAL, sehingga bisa dipakai sebagai langkah CI sebelum
`eas build`. Tidak ada secret yang dicetak (Client ID disamarkan).

---

## Troubleshooting

Semua pesan di bawah berasal dari `AUTH_SETUP_MESSAGES` / `friendlyAuthError`
di `src/lib/auth.ts`.

| Pesan di layar | Penyebab | Perbaikan |
| --- | --- | --- |
| `Build ini belum membawa konfigurasi Supabase (EXPO_PUBLIC_*)…` | Env tidak ada di environment build | Set langkah 5 untuk environment yang dipakai profile (`preview`), lalu build ulang |
| `GitHub tidak mengenali Client ID ini (halaman 404 …)` | Client ID bukan dari tab **OAuth Apps**, atau beda project | Langkah 2–3. Jangan pakai Client ID dari tab **GitHub Apps** |
| `Authorization callback URL di GitHub OAuth App tidak cocok…` | Callback di OAuth App bukan ke Supabase | Isi `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |
| `Redirect URL belum diizinkan di Supabase…` | `gitscope://auth/callback` belum terdaftar | Langkah 4 |
| `Login belum selesai: browser ditutup sebelum hasil masuk ke aplikasi…` | Tab ditutup **atau** berhenti di halaman error GitHub | Cek dulu apakah tadi muncul 404 / `redirect_uri MUST match`; kalau ya, langkah 2 |
| `Provider GitHub belum diaktifkan…` | Provider/Client ID/Secret salah | Langkah 2–3 |
| `Sesi login kedaluwarsa (code sudah dipakai)…` | URL callback dipakai dua kali / menunggu terlalu lama | Tekan tombol lagi dari awal; jangan refresh URL callback |
| `Verifier PKCE tidak ditemukan…` | Data app dibersihkan di tengah alur, atau `flowType` bukan PKCE | Jangan clear data/force-stop saat browser terbuka; pastikan `flowType: 'pkce'` |
| Tombol berubah jadi "Menghubungkan…" lalu pesan Client ID tanpa browser terbuka | Probe authorize mendapat 404 dari GitHub | Normal: itu deteksi dini, bukan bug. Perbaiki Client ID (langkah 2–3) |
| Browser terbuka lalu kembali tanpa pesan | App ter-kill saat login tapi `EXPO_PUBLIC_DS_AUTH` bukan `api` | Set flag `api` (langkah 5) |
| Login sukses tapi profil kosong | Migrasi DB/trigger belum dijalankan | Terapkan `supabase/migrations` ke project hosted (`npx supabase db push`) |

Temuan `npm run oauth:check` yang hanya bisa diperbaiki di dashboard Supabase:

| Temuan skrip | Perbaikan |
| --- | --- |
| `Google: authorize ditolak (400) — Unsupported provider: provider is not enabled` | Authentication → Providers → Google: aktifkan provider dan isi Client ID/Secret ([`auth-google-github-link.md`](./auth-google-github-link.md) §1) |
| `GitHub: authorize meminta user:email (melanggar POL-2…)` | Authentication → Providers → GitHub: hapus `user:email` dari daftar scope provider, sisakan `read:user` |

Debug cepat di perangkat (APK release tetap bisa dilihat lewat `adb`):

```bash
adb logcat | grep -iE "gitscope|supabase|auth"
```

---

## Catatan keamanan

- Scope OAuth dibatasi `read:user` (tanpa akses email) — sesuai POL-2.
- Session disimpan lewat `AsyncStorage`; token refresh otomatis.
- RLS wajib aktif di semua tabel yang dibaca app; kunci publishable/anon tidak
  membuka data tanpa policy.
- `EXPO_PUBLIC_*` selalu dianggap publik — jangan taruh secret di sana.
