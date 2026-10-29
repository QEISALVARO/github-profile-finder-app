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
| **POL-2** | Privasi Identitas & Tanpa Email | Scope OAuth hanya `read:user` (tanpa email). Tabel `profiles` tidak menyimpan email. (Sanitasi ingestion menyusul di BE-2.) | `supabase/migrations/20261001000004_profiles.sql`, `supabase/config.toml` |
| **POL-3** | Tanpa Ekspor Massal | RLS membatasi query bulk dari role klien. `max_rows = 1000` di config. | `supabase/config.toml` & RLS per user |
| **POL-4** | Default Rekruter Aman | Nilai default `target_countries = '{}'` | `supabase/migrations/20261001000004_profiles.sql` |
| **POL-5** | Retensi Lookup & Anti-Pelecehan | Pesan tidak bisa dikirim jika diblokir. Snapshot non-terdaftar kedaluwarsa dalam 24 jam dan analisis dalam 7 hari (`expires_at`), (Retensi snapshot/analisis + `purge_expired_lookups()` menyusul di BE-2.) | `supabase/tests/03_rls_policies.sql` |
| **POL-6** | Akses Data Resmi Tanpa Scraping | Seluruh ingestion data GitHub wajib memakai API resmi (tanpa scraping HTML). (Implementasi GraphQL/REST menyusul di BE-2.) | - |
| **POL-8** | Hak Penghapusan Akun (Right to Erasure) | Penghapusan akun berjenjang + pencabutan sesi (menyusul di BE-1, `delete-account`). | - |
| **POL-9** | Keharusan Negara sebelum Terdaftar (Listed) | Trigger `BEFORE INSERT/UPDATE ON developer_settings` menolak `listed=true` jika `country_code` null (`POL9_COUNTRY_REQUIRED`). Trigger `AFTER UPDATE ON profiles` mematikan `listed=false` jika negara dihapus. Sinkronisasi `projects.country_code`. (Menyusul di BE-1: `pol9_triggers` + pgTAP `04_pol9_enforcement`.) | - |

---

## 3. Pemetaan Kebijakan AI / Analisis (AIR)

| Kebijakan | Deskripsi Aturan | Implementasi Database & Function | Bukti Pengujian |
|---|---|---|---|
| **AIR-1** | Transparansi & Sinyal Terbuka | (Menyusul di BE-2: scoring engine + `evidence[]`.) | - |
| **AIR-2** | Integritas Penulisan & Re-scoring | Klien dilarang menulis langsung ke tabel analisis. (Penyimpanan `facts` + re-scoring menyusul di BE-2.) | `supabase/tests/02_default_deny.sql` |
| **AIR-3** | Hak Analisis Profil Milik Sendiri | (Menyusul di BE-2: `analyze-developer`.) | - |
| **AIR-5** | Normalisasi Lokasi & Bebas Bias | Fungsi `normalize_location(text)` (menyusul di BE-1 beserta pgTAP `05_location_normalize`). | - |

