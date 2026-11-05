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
| `projects` | **RPC-only** — tanpa GRANT/kebijakan langsung untuk klien; baca via `search_projects` / `featured_projects` / `my_projects` (ADR-015) | Service Role (Edge Function) | Service Role (Edge Function) | Service Role (Edge Function) |
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
| **POL-1 (BE-3)** | Feed/featured/facet hanya visible; tulis langsung dicabut (D3) | 019_hardening, RPC definer | pgTAP 08 |
| **POL-3 (BE-3)** | lim clamp 1-50, rate limit per endpoint, tanpa bulk | app_rate_limits + RPC | pgTAP 08 |
| **POL-6 (BE-3)** | Ingestion repo via GraphQL resmi; demo SSRF-safe | github/*, ssrf, publish-project | Deno 11/11 |
| **POL-8 (BE-3)** | Moderasi: report unik + rate limit; admin klaim JWT; audit_log default-deny | admin_set_project_hidden | pgTAP 09 |
| **POL-9 (BE-3)** | Publish butuh negara (listed); kosongkan -> auto-unlist -> hilang | trigger sync + visible | pgTAP 08 |
| **POL-3 (A3)** | `projects` tidak dapat dibaca/ditulis langsung oleh klien; hanya RPC definer | Migrasi 022 (cabut grant + hapus policy inert) | pgTAP 10 (CI: menunggu run PR) |
| **AIR-5 (BE-3)** | Tanpa atribut sensitif; role dari bahasa/manifest; facet = domisili | role.ts, FeedRole | kontrak + Deno |
| **POL-9** | Keharusan Negara sebelum Terdaftar (Listed) | Trigger `BEFORE INSERT/UPDATE ON developer_settings` menolak `listed=true` jika `country_code` null (`POL9_COUNTRY_REQUIRED`). Trigger `AFTER UPDATE ON profiles` mematikan `listed=false` jika negara dihapus. Sinkronisasi `projects.country_code`. (Menyusul di BE-1: `pol9_triggers` + pgTAP `04_pol9_enforcement`.) | - |

---

## 3. Pemetaan Kebijakan AI / Analisis (AIR)

| Kebijakan | Deskripsi Aturan | Implementasi Database & Function | Bukti Pengujian |
|---|---|---|---|
| **AIR-1** | Transparansi & Sinyal Terbuka | (Menyusul di BE-2: scoring engine + `evidence[]`.) | - |
| **AIR-2** | Integritas Penulisan & Re-scoring | Klien dilarang menulis langsung ke tabel analisis. (Penyimpanan `facts` + re-scoring menyusul di BE-2.) | `supabase/tests/02_default_deny.sql` |
| **AIR-3** | Hak Analisis Profil Milik Sendiri | (Menyusul di BE-2: `analyze-developer`.) | - |
| **AIR-5** | Normalisasi Lokasi & Bebas Bias | Fungsi `normalize_location(text)` (BE-1) + pasal BE-4: tidak ada fungsi yang menyimpulkan atribut sensitif dari nama/avatar/bio. | pgTAP 05; checklist review BE-4 (§4) |
| **AIR-1 (BE-4)** | Transparansi & sinyal terbuka | DiscoverItem hanya `login,name,avatarUrl,role,primaryLanguage,countryCode,city,score,availability` — tanpa `breakdown`, evidence, atau label lolos/gagal. | pgTAP 11 (kunci JSON) |
| **AIR-3 (BE-4)** | Analisis profil sendiri | Developer `listed` tanpa analisis tidak muncul di Discover; FE memicu `analyze-developer` untuk login sendiri. | pgTAP 11 (D1) + `talent.md` |
| **AIR-4 (BE-4)** | Audit bias v0 | `bias_report_v0()` admin/service-only; kelompok n<10 dimasking; tanpa identitas individu. | pgTAP 13; laporan: `bias-audit.md` (**BELUM DIUJI**) |
| **AIR-5 (BE-4)** | Tanpa inferensi atribut sensitif | Review kode: role hanya dari bahasa/manifest; negara hanya dari profil terkonfirmasi; tidak ada penggunaan nama/avatar/bio untuk atribut sensitif. | Checklist review di bawah |
| **POL-5 (BE-4)** | Retensi listing | Trigger `sync_analysis_retention`: listed → permanen; unlisted → 7 hari/24 jam; `purge_expired_lookups` mengecualikan login listed. | pgTAP 13 |
| **POL-8 (BE-4)** | Right to erasure pipeline | Trigger `profiles_purge_pipeline` menghapus entri pipeline orang lain yang merujuk login akun terhapus. | pgTAP 13 |
| **POL-3 (BE-4)** | Tanpa ekspor massal | Discover/Compare/Pipeline hanya RPC per-halaman; rate limit per endpoint; tanpa endpoint CSV/ekspor. | pgTAP 11/12 |

### Checklist review AIR-5 (BE-4, 5 Nov 2026)

- [x] Tidak ada fungsi yang membaca `profiles.name`, `avatar_url`, atau `bio` untuk menyimpulkan gender/etnis/usia/kesehatan.
- [x] `inferred_role` hanya dari bahasa dominan + manifest framework (`scoring/role.ts`).
- [x] `country_code` hanya dari profil yang dikonfirmasi pengguna/normalisasi lokasi eksplisit (POL-9).
- [x] Discover tidak menerima filter atribut sensitif; hanya role/skor/negara/bahasa/availability.
- [x] Keluaran Discover/Compare/Pipeline tidak memuat email, breakdown, atau evidence.

