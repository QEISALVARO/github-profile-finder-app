# Migration Runbook — Auth/Profile

Dokumen singkat untuk migration SQL di `supabase/migrations/` (termasuk
`20261001000023_recruiter_email_auth.sql`).

## Prinsip

- Migration bersifat **forward-only**; jangan mengedit migration yang sudah
  diaplikasikan ke project hosted.
- Jalankan lewat Supabase CLI/CI, bukan SQL manual di Dashboard.
- Sebelum apply ke hosted, ambil backup/PITR snapshot dan catat versi migration
  terakhir.
- RLS tetap aktif; migration baru tidak boleh memberi `bypassrls` ke klien.
- Jangan menaruh service role key/SMTP secret di SQL atau repo.

## Urutan verifikasi lokal/CI

```bash
make preflight   # gagal jelas bila Docker/Supabase CLI/Deno tidak ada
make up
make reset       # semua migration + seed dari nol
make test        # pgTAP + Deno contract/function tests
make types       # cek drift tipe database
make lint
make down
```

`make reset` menguji migration dari database kosong. Jika langkah ini belum
dijalankan, statusnya **BLOCKED**, bukan lulus.

## Jika migration gagal

1. Jangan menandai deploy berhasil; simpan log migration dan pgTAP.
2. Perbaiki penyebabnya dengan migration **baru** (mis. guard idempoten,
   `drop constraint if exists`, backfill terpisah).
3. Uji ulang dari nol dengan `make reset && make test`.
4. Untuk production yang sudah terlanjur setengah jalan, gunakan transaksi
   per-file/ON_ERROR_STOP milik Supabase CLI; bila perlu pulihkan backup/PITR,
   lalu apply ulang urutan migration yang sudah diperbaiki.
5. Catat tanggal, versi migration terakhir, dan hasil di PR/deployment log.

## Cakupan auth/profile yang dijaga

- Trigger `handle_new_user` membuat profile GitHub/Google/email.
- Akun email tidak mendapat `github_id`/`github_login` palsu.
- Onboarding recruiter tidak membutuhkan GitHub.
- `listed=true` membutuhkan identitas GitHub + negara (POL-9).
- RLS profile hanya membaca profil sendiri, developer listed, atau peserta
  percakapan aktif.
- RPC onboarding/settings hanya mengubah `auth.uid()`.
- Hapus `auth.users` meng-cascade profile, settings, project, dan data terkait.
