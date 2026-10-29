# Matriks Kebijakan RLS & Kepatuhan POL / AIR

Dokumen ini merangkum penegakan keamanan, Row Level Security (RLS), dan pemetaan kebijakan produk (POL-1…9, AIR-1…5 dari PRD V2 §3 & §7.1) ke dalam lapisan database Postgres serta rangkaian pengujian pgTAP.

---

## 1. Matriks Kebijakan Row Level Security (RLS)

Setiap tabel di skema `public` menerapkan RLS aktif dengan prinsip **DEFAULT DENY** (tidak ada aksi yang diizinkan tanpa kebijakan eksplisit):

| Tabel | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `countries` | Authenticated publik | Service Role | Service Role | Service Role |
| `cities` | Authenticated publik | Service Role | Service Role | Service Role |
| `keyword_aliases` | Authenticated publik | Service Role | Service Role | Service Role |
| `profiles` | Diri sendiri; ATAU developer `listed=true` (+ negara terisi); ATAU partner dalam percakapan aktif | Service Role / Trigger Auth | Diri sendiri (kolom non-sensitif) | Diri sendiri / Service Role |
| `developer_settings`| Pemilik; Recruiter hanya jika developer `listed = true` | Pemilik | Pemilik | Pemilik |
| `recruiter_profiles` | Publik (authenticated) | Pemilik | Pemilik | Pemilik |
| `projects` | Publik jika `published=true`, `is_hidden=false`, dan pemilik `listed=true` | Pemilik | Pemilik | Pemilik |
| `analyses` | Publik (authenticated) | Service Role | Service Role | Service Role |
| `github_snapshots` | Service Role | Service Role | Service Role | Service Role |
| `conversations` | Peserta (`recruiter_id = auth.uid()` OR `developer_id = auth.uid()`) | Peserta | Peserta | Peserta |
| `messages` | Peserta percakapan terkait | Peserta (hanya bila status percakapan `'active'`) | Ditolak | Ditolak |
| `pipeline_entries` | Pemilik (`recruiter_id = auth.uid()`) | Pemilik | Pemilik | Pemilik |
| `reports` | Pemilik (`reporter_id = auth.uid()`) | Pemilik | Ditolak | Ditolak |
| `push_tokens` | Pemilik (`user_id = auth.uid()`) | Pemilik | Pemilik | Pemilik |
| `blocks` | Pemilik (`blocker_id = auth.uid()`) | Pemilik | Ditolak | Pemilik |
| `abuse_reports` | Pemilik (`reporter_id = auth.uid()`) | Pemilik | Ditolak | Ditolak |

---

## 2. Pemetaan Kebijakan Produk (POL) ke Implementasi & Test

| Kebijakan | Deskripsi Aturan | Implementasi Database | Bukti Pengujian |
|---|---|---|---|
| **POL-1** | Default Aman Privasi Profil | Nilai default kolom: `developer_settings.listed = false`, `open_to_messages = false` | `supabase/tests/02_default_deny.sql` & `03_rls_policies.sql` |
| **POL-2** | Privasi Identitas & Tanpa Email | Scope OAuth hanya `read:user` (tanpa email). Tabel `profiles` tidak menyimpan email. Ingestion membuang seluruh pola email dari bio & deskripsi sebelum disimpan ke `facts`. | `supabase/migrations/20261001000004_profiles.sql`, `supabase/config.toml`, & `supabase/functions/analyze-developer/index_test.ts` (Test 1) |
| **POL-3** | Tanpa Ekspor Massal | RLS membatasi query bulk dari role klien. `max_rows = 1000` di config. | `supabase/config.toml` & RLS per user |
| **POL-4** | Default Rekruter Aman | Nilai default `target_countries = '{}'` | `supabase/migrations/20261001000004_profiles.sql` |
| **POL-5** | Retensi Lookup & Anti-Pelecehan | Pesan tidak bisa dikirim jika diblokir. Snapshot non-terdaftar kedaluwarsa dalam 24 jam dan analisis dalam 7 hari (`expires_at`), dibersihkan via `purge_expired_lookups()`. | `supabase/tests/03_rls_policies.sql` & `supabase/tests/07_be2_ingestion.sql` |
| **POL-6** | Akses Data Resmi Tanpa Scraping | Seluruh ingestion data GitHub menggunakan API GraphQL & REST resmi dengan rate limit terukur (tanpa scraping HTML). | `supabase/functions/_shared/github/` |
| **POL-8** | Hak Penghapusan Akun (Right to Erasure) | Edge Function `delete-account` melakukan cascade delete semua relasi user lalu memanggil `auth.admin.deleteUser`. | `supabase/functions/delete-account/` |
| **POL-9** | Keharusan Negara sebelum Terdaftar (Listed) | Trigger `BEFORE INSERT/UPDATE ON developer_settings` menolak `listed=true` jika `country_code` null (`POL9_COUNTRY_REQUIRED`). Trigger `AFTER UPDATE ON profiles` mematikan `listed=false` jika negara dihapus. Sinkronisasi `projects.country_code`. | `supabase/migrations/20261001000011_pol9_triggers.sql` & `supabase/tests/04_pol9_enforcement.sql` |

---

## 3. Pemetaan Kebijakan AI / Analisis (AIR)

| Kebijakan | Deskripsi Aturan | Implementasi Database & Function | Bukti Pengujian |
|---|---|---|---|
| **AIR-1** | Transparansi & Sinyal Terbuka | Skor dilengkapi `evidence[]` (maks 12 item). Tidak ada keputusan biner "reject/pass"; sistem menyajikan sinyal terverifikasi. | `supabase/functions/_shared/scoring/score_test.ts` (G1 test & evidence checks) |
| **AIR-2** | Integritas Penulisan & Re-scoring | Kolom `facts` disimpan lengkap sehingga re-scoring versi baru dapat dihitung tanpa fetch ulang (`rescore(facts)`). Klien dilarang menulis langsung. | `supabase/tests/02_default_deny.sql` & `supabase/functions/_shared/scoring/score_test.ts` (Test 11) |
| **AIR-3** | Hak Analisis Profil Milik Sendiri | Pengembang dapat meminta skor keaslian akun GitHub miliknya sendiri meskipun bukan recruiter (`caller.githubLogin === targetLogin`). | `supabase/functions/analyze-developer/index.ts` |
| **AIR-5** | Normalisasi Lokasi & Bebas Bias | Fungsi `normalize_location(text)` mengevaluasi kecocokan token lokal tanpa pihak ketiga; hanya diterima bila confidence ≥ 80. Dilarang menyimpulkan gender/ras dari nama/bio. | `supabase/tests/05_location_normalize.sql` & `supabase/functions/analyze-developer/index.ts` |

