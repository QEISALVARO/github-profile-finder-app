# Login Google + kewajiban menautkan GitHub

Dokumen ini melengkapi [`auth-github-oauth.md`](./auth-github-oauth.md). Login GitHub
tetap jalur utama; Google ditambahkan sebagai alternatif **masuk**, bukan
alternatif identitas. Setiap akun wajib punya identitas GitHub sebelum
onboarding bisa diselesaikan.

## Alur

```
Welcome ──► Continue with GitHub ──► OAuth GitHub ──► onboarding
   └─────► Continue with Google ──► OAuth Google ──► /connect-github
                                                        │
                                        linkIdentity('github')
                                                        │
                                   RPC connect_github_identity()
                                                        │
                                                    onboarding
```

1. **GitHub**: `signInWithOAuth({ provider: 'github' })` seperti sebelumnya
   (scope `read:user`, tanpa email — POL-2). Trigger auth membuat profil lengkap,
   `githubId > 0`, user langsung boleh onboarding.
2. **Google**: `signInWithOAuth({ provider: 'google' })`. Trigger auth membuat
   profil `auth_provider = 'google'` **tanpa** `github_id` / `github_login`.
   `mapSupabaseSession` tetap mengembalikan sesi (`githubId: 0`) supaya app bisa
   menahan user di gerbang.
3. **Gerbang**: root layout hanya mendaftarkan `connect-github` selama
   `session != null && !onboarded && githubId === 0`; route `onboarding` baru
   tersedia setelah `githubId > 0`.
4. **Penautan**: `linkIdentity({ provider: 'github' })` (butuh *Allow manual
   linking*) → browser → deep link `gitscope://auth/callback` → `code` PKCE
   ditukar seperti login biasa. Lalu `readLinkedGitHubIdentity()` membaca
   `auth.identities`, dan RPC `connect_github_identity()` menyalin
   `github_id`/`github_login` dari identitas **yang sudah diverifikasi Supabase**
   ke `profiles`. Klien tidak pernah mengirim login GitHub sendiri.
5. Metadata sesi diberi `gitscope_github` + `github_id` + `user_name` agar cold
   start berikutnya tidak menampilkan gerbang lagi. Profil di database tetap
   sumber otoritatif untuk backend (`authenticateCaller`, publish analisis,
   chat).

Guard server: `complete_onboarding` menolak sesi tanpa `github_login`
(`VALIDATION: GitHub account must be linked before onboarding`), jadi aturan ini
tidak bergantung pada UI saja.

## 1. Aktifkan provider Google di Supabase

1. Google Cloud Console → **APIs & Services → Credentials → Create credentials
   → OAuth client ID → Web application**.
2. **Authorized redirect URI**:
   `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
   (bukan `gitscope://auth/callback` — deep link app adalah tujuan akhir
   Supabase, bukan tujuan Google).
3. Supabase Dashboard → **Authentication → Providers → Google**: isi Client ID
   dan Client Secret, aktifkan provider.
4. Supabase Dashboard → **Authentication → Providers → Allow manual linking**
   → aktifkan. Tanpa opsi ini `linkIdentity()` gagal dengan pesan *manual
   linking is disabled* (app menerjemahkannya lewat `AUTH_SETUP_MESSAGES.manualLinking`).
5. **Authentication → URL Configuration** tetap seperti dokumen GitHub:
   `gitscope://auth/callback` dan `gitscope://**` harus ada di Redirect URLs.

Lokal (`supabase start`) sudah diatur di `supabase/config.toml`:

```toml
enable_manual_linking = true

[auth.external.google]
enabled = true
client_id = "env(SUPABASE_AUTH_GOOGLE_CLIENT_ID)"
secret = "env(SUPABASE_AUTH_GOOGLE_SECRET)"
```

Isi `SUPABASE_AUTH_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_GOOGLE_SECRET` di `.env`
(lihat `.env.example`).

## 2. Migrasi database

`supabase/migrations/20261001000022_google_auth_github_link.sql`:

- `profiles.github_id`, `login`, `github_login` boleh `NULL` (akun Google belum
  menautkan GitHub). Unique index `github_login` tetap berlaku.
- Kolom `auth_provider` (`'github' | 'google'`) sebagai metode login utama.
- Trigger `handle_new_user()` menangani GitHub dan Google. Handle akun Google
  dibuat acak (`user-xxxxxx`), **bukan** email — `profiles` bisa dibaca user
  lain lewat chat/feed (POL-2).
- RPC `connect_github_identity()` (security definer, hanya `authenticated`)
  menautkan identitas GitHub ke `auth.uid()`; konflik `github_login`/`github_id`
  dengan akun lain menghasilkan pesan yang bisa ditampilkan ke user.
- Trigger `profiles_protect_github_identity` menolak `UPDATE` dari klien yang
  mengubah `github_id`, `github_login`, `login`, atau `auth_provider`; satu-satunya
  jalur tulis adalah RPC di atas (backend `service_role` tetap boleh).
- `complete_onboarding()` sekarang menolak sesi tanpa GitHub.

Terapkan dengan `supabase db push` (hosted) atau `supabase migration up`
(lokal).

## 3. Uji manual

1. `npx expo run:android` (atau build dev) dengan
   `EXPO_PUBLIC_DS_AUTH=api` dan env Supabase terisi.
2. **Continue with Google** → setelah kembali ke app harus muncul layar
   *Hubungkan GitHub Anda*, dan tab onboarding belum bisa diakses.
3. Tekan **Hubungkan GitHub** → OAuth GitHub → kembali ke app → lanjut
   onboarding. Di tabel `profiles`, baris user harus terisi `github_id` dan
   `github_login`.
4. Tutup app, buka lagi → langsung ke onboarding/tabs (bukan gerbang), karena
   `gitscope_github` sudah ada di metadata sesi.
5. Login **Continue with GitHub** tetap langsung ke onboarding.

Sebelum build, jalankan `npm run oauth:check` — skrip ini memeriksa deep link,
`supabase/config.toml`, serta memprobe `/auth/v1/authorize` untuk kedua provider
(deteksi Client ID kosong, callback salah, redirect allowlist, dan provider
Google yang belum aktif).

## Troubleshooting

| Pesan / gejala | Penyebab | Tindakan |
| --- | --- | --- |
| `Penautan akun belum aktif di Supabase…` | *Allow manual linking* mati | Aktifkan di Authentication → Providers, atau `enable_manual_linking = true` |
| `Akun GitHub ini sudah tertaut ke akun Gitscope lain…` | `github_login`/`github_id` sudah dipakai user lain | Masuk langsung dengan GitHub, atau tautkan akun GitHub lain |
| Google: `redirect_uri_mismatch` | Authorized redirect URI bukan callback Supabase | Ganti ke `https://<PROJECT_REF>.supabase.co/auth/v1/callback` |
| Google: `Provider Google belum diaktifkan…` | Provider mati / Client ID kosong | Isi Client ID + Secret di Supabase |
| Gerbang muncul lagi setelah restart | `updateUser` metadata gagal (offline) | Buka gerbang → penautan mendeteksi identitas yang sudah ada dan langsung menyimpan profil |
| RPC balas `GitHub account must be linked before onboarding` | Sesi belum punya identitas GitHub | Selesaikan penautan; jangan panggil `complete_onboarding` langsung |

## Catatan keamanan

- Login GitHub tetap memakai scope `read:user` tanpa email (POL-2). Google
  mengembalikan email, tetapi email tidak pernah ditulis ke `profiles` maupun
  ditampilkan ke user lain.
- `connect_github_identity` tidak menerima parameter dari klien; datanya dibaca
  dari `auth.identities` milik `auth.uid()`.
- Klien tidak bisa mengakali gerbang dengan `update profiles set github_login =
  '...'`: trigger `profiles_protect_github_identity` menolak perubahan kolom
  identitas di luar RPC penautan.
- Metadata `gitscope_github` hanya cache tampilan. Kalau dipalsukan, akses
  server-side tetap mengikuti `profiles.github_login` (dan RLS/RPC).
