# GitHub OAuth di APK — setup lengkap

Dokumen ini menyalakan **login GitHub asli** (Supabase OAuth, scope `read:user`)
untuk build Android/iOS, termasuk APK dari EAS Build.

Tanpa konfigurasi ini aplikasi tetap jalan: tombol *Continue with GitHub* jatuh
ke **sesi demo lokal** (`octocat`) supaya onboarding bisa dicoba.

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
| `src/lib/auth.ts` | buka browser, tukar `code` PKCE, cache anti-double-exchange |
| `src/app/auth/callback.tsx` | jalur deep link saat app dibuka dingin |
| `src/lib/supabase.ts` | klien Supabase lazy, `flowType: 'pkce'` |
| `src/app/welcome.tsx` | CTA + fallback demo bila backend belum dikonfigurasi |
| `eas.json` | profile `preview`/`production` → environment EAS yang sesuai |

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

**B. Manual**

1. Buat project di <https://database.new>.
2. Catat **Project URL** dan **Publishable key** (atau anon key) dari
   *Project Settings → API*.
3. Simpan untuk langkah 5.

> Kunci publishable/anon **boleh** ikut di bundle aplikasi — keamanan data
> dijaga RLS. Jangan pernah memakai `service_role`/secret key di app.

---

## 2. Buat GitHub OAuth App

1. Buka <https://github.com/settings/developers> → **New OAuth App**.
2. Isi:
   - **Application name**: `gitscope`
   - **Homepage URL**: bebas, mis. `https://github.com/<user>/gitscope`
   - **Authorization callback URL**:
     ```
     https://<PROJECT_REF>.supabase.co/auth/v1/callback
     ```
     `<PROJECT_REF>` = subdomain project Supabase kamu.
3. **Register application**, lalu **Generate a new client secret**.
4. Catat **Client ID** dan **Client secret**.

> Callback URL GitHub **selalu** mengarah ke Supabase, bukan ke `gitscope://`.
> Deep link `gitscope://…` baru dipakai setelah Supabase selesai memproses.

---

## 3. Aktifkan provider GitHub di Supabase

Supabase Dashboard → **Authentication → Providers → GitHub**:

- Enable provider.
- Tempel **Client ID** dan **Client Secret** dari langkah 2.
- Simpan.

---

## 4. Izinkan redirect URL kembali ke app

Supabase Dashboard → **Authentication → URL Configuration**:

- **Site URL**: `http://localhost:3000` (hanya fallback; app selalu mengirim
  `redirect_to` eksplisit).
- **Additional Redirect URLs** — tambahkan **keduanya**:
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

## Troubleshooting

| Pesan di layar | Penyebab | Perbaikan |
| --- | --- | --- |
| `Build ini belum membawa konfigurasi Supabase (EXPO_PUBLIC_*)…` | Env tidak ada di environment build | Set langkah 5 untuk environment yang dipakai profile (`preview`), lalu build ulang |
| `Redirect URL belum diizinkan di Supabase…` | `gitscope://auth/callback` belum terdaftar | Langkah 4 |
| `Provider GitHub belum diaktifkan…` | Provider/Client ID/Secret salah | Langkah 2–3 |
| `Sesi login kedaluwarsa (code sudah dipakai)…` | URL callback dipakai dua kali / menunggu terlalu lama | Tekan tombol lagi dari awal; jangan refresh URL callback |
| `Verifier PKCE tidak ditemukan…` | Data app dibersihkan di tengah alur, atau `flowType` bukan PKCE | Jangan clear data/force-stop saat browser terbuka; pastikan `flowType: 'pkce'` |
| Browser terbuka lalu kembali tanpa pesan | App ter-kill saat login tapi `EXPO_PUBLIC_DS_AUTH` bukan `api` | Set flag `api` (langkah 5) |
| Login sukses tapi profil kosong | Migrasi DB/trigger belum dijalankan | Terapkan `supabase/migrations` ke project hosted (`npx supabase db push`) |

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
