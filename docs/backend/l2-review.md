# Tinjauan L2 — Regulasi AI Rekrutmen & Metodologi Bias

Status: **selesai sebagai tinjauan internal (10 Nov 2026)**. Ini bukan nasihat
hukum; temuan di bawah harus dikonfirmasi penasihat hukum sebelum Discover
dibuka ke pengguna eksternal. Sumber diperiksa 10 November 2026 dan dicantumkan
di bagian 8.

Ruang lingkup: fitur **Discover, Compare, Pipeline, dan skor `authenticity` v2**
(BE-4). Di luar lingkup: kontrak dagang/sanksi, hukum ketenagakerjaan lokal
selain yang disebut, dan kepatuhan toko aplikasi.

## 0. Ringkasan keputusan

| Pertanyaan | Jawaban |
|---|---|
| Boleh dilanjutkan untuk beta tertutup (undangan, recruiter terverifikasi, tanpa keputusan rekrutmen otomatis)? | **Ya**, dengan pengungkapan "decision support" dan jalur keberatan yang sudah ada (AIR-1/AIR-3). |
| Boleh Discover dipasarkan sebagai alat rekrutmen di **EU**? | **Belum.** Klasifikasi AI Act belum final; jika masuk Annex III, kewajiban risiko tinggi berlaku 2 Des 2027. Siapkan berkasnya sekarang. |
| Boleh dipakai employer di **New York City**? | **Tidak untuk diposisikan sebagai AEDT.** LL 144 mewajibkan impact ratio per sex/race/intersectional, sedangkan produk tidak mengumpulkan (dan AIR-5 melarang menyimpulkan) atribut tersebut. |
| Boleh dipakai employer di **California**? | Boleh sebagai alat bantu dengan pengungkapan, tetapi regulasi FEHA ADS (efektif 1 Okt 2025) menuntut bukti non-diskriminasi dan retensi data 4 tahun; vendor dapat ikut bertanggung jawab. |
| Apakah audit bias v0 sudah cukup sebagai bukti kepatuhan? | **Belum.** Ia menguji mekanisme, bukan populasi nyata, dan tidak memakai impact ratio/interval kepercayaan. |

## 1. Fakta produk yang relevan

- Skor `authenticity` v2 adalah **fungsi deterministik berbobot** atas sinyal
  publik GitHub (aktivitas, orisinalitas, kedalaman, konsistensi, kesehatan
  repo) — lihat `scoring-v2.md`. Tidak ada model yang belajar dari data
  kandidat dan tidak ada atribut sensitif yang diinferensi (AIR-5).
- Keluaran dipakai recruiter untuk **menemukan, membandingkan, dan menyimpan**
  kandidat. Tidak ada auto-reject/auto-hire (AIR-1); keputusan tetap manusia.
- Data: profil publik GitHub, `country_code` (domisili, POL-8), bahasa utama,
  role hasil inferensi, skor. Tanpa email, tanpa gender/etnis/usia.
- Retensi: analisis developer `listed` dipertahankan, entri pipeline
  diminimalkan (login, stage, catatan) dan dipurge saat akun dihapus (D5).

## 2. Klasifikasi hukum per yurisdiksi

### 2.1 EU — AI Act (Regulation (EU) 2024/1689, diubah 2026/1744)

- **Definisi "AI system" (Art. 3(1))** menekankan kemampuan *inferensi*.
  Recital 12 mengecualikan sistem yang hanya menjalankan aturan yang sepenuhnya
  ditetapkan manusia. Skor Gitscope adalah aturan berbobot, sehingga
  **argumen kuat bahwa ia bukan "AI system"** — tetapi ini penilaian hukum dan
  harus didokumentasikan, bukan diasumsikan.
- **Jika dianggap AI system**, Annex III butir 4(a) mencakup sistem untuk
  "recruitment atau selection", termasuk mengevaluasi kandidat. Layanan
  pencarian/peringkat kandidat adalah contoh yang dipakai Komisi. Pengecualian
  Art. 6(3) sempit dan **tidak berlaku untuk profiling**; skor atas orang
  adalah profiling dalam arti GDPR, jadi pengecualian sulit dipakai.
- **Timeline yang berlaku (terverifikasi):** Digital Omnibus on AI menjadi
  **Regulation (EU) 2026/1744**, ditandatangani 8 Juli 2026, OJ 24 Juli 2026,
  berlaku 27 Juli 2026. Kewajiban risiko tinggi Annex III (stand-alone)
  berlaku **2 Desember 2027**; Annex I 2 Agustus 2028. Yang **tidak** ditunda:
  larangan praktik (2 Feb 2025), AI literacy, kewajiban GPAI (2 Agu 2025), dan
  transparansi Art. 50 (2 Agu 2026).
- **Peran:** Gitscope kemungkinan *provider* untuk skor dan *deployer* bersama
  recruiter. Jika high-risk: Art. 9 (risk management), 10 (data governance),
  11–12 (dokumentasi/log), 13–14 (instruksi & oversight), 15 (akurasi/
  cybersecurity), 43 (conformity assessment), 49 (registrasi), 72
  (post-market monitoring); sisi deployer Art. 26 (penggunaan sesuai instruksi,
  oversight manusia, log) dan Art. 27 (FRIA — hanya untuk badan publik/penyedia
  layanan publik, jadi kemungkinan tidak wajib, tetapi praktik baik).

### 2.2 GDPR / UK GDPR

- Dasar pemrosesan: *legitimate interest* (Art. 6(1)(f)) paling realistis untuk
  profil publik, dengan **Legitimate Interest Assessment** terdokumentasi;
  persetujuan developer (opt-in `listed`) tetap menjadi kontrol produk.
- **Art. 13/14 (transparansi):** developer harus tahu skor dibuat dan
  dipakai — sudah dipenuhi sebagian oleh AIR-2/AIR-3 (`/me` menunjukkan skor
  dan bukti) dan perlu ditambah privacy notice.
- **Art. 22 (keputusan otomatis):** tidak muncul karena tidak ada keputusan
  otomatis final; ini justru alasan AIR-1 dipertahankan. Jangan pernah
  menambahkan fitur auto-reject tanpa menilai ulang Art. 22.
- **Art. 35 (DPIA):** profiling sistematis atas data publik dalam skala besar
  dan dipakai untuk seleksi → DPIA **wajib** sebelum rilis eksternal.
- **Art. 9 (kategori khusus):** tidak ada data kategori khusus; tetapi
  negara/bahasa dapat **berkorelasi** dengan asal-usul etnis/nasional. Ini
  risiko proksi, bukan pemrosesan Art. 9 langsung.
- Transfer internasional: region Supabase + SCC/DPA bila pengguna EU.

### 2.3 Indonesia — UU PDP 27/2022 dan PP pelaksananya

- **Pasal 10 UU PDP**: subjek data berhak mengajukan keberatan atas keputusan
  yang **hanya** didasarkan pada pemrosesan otomatis, termasuk profiling, yang
  berdampak hukum/signifikan. Karena skor bukan keputusan final, jalur
  keberatan tetap harus nyata (koreksi skor + opt-out, AIR-3).
- **PP 33/2026** (peraturan pelaksana UU PDP, diundangkan 16 Juli 2026,
  berlaku 16 Januari 2027) mengatur kewajiban operasional, hak subjek data,
  dan transfer. Teks resmi perlu diverifikasi ke JDIH sebelum dipakai sebagai
  dasar penolakan/klaim.
- Kewajiban pengendali: dasar pemrosesan, pemberitahuan, DPO bila memenuhi
  ambang, notifikasi kebocoran 3x24 jam, penilaian dampak.

### 2.4 Amerika Serikat

- **NYC Local Law 144 (efektif 1 Jan 2023, ditegakkan 5 Jul 2023):** alat
  masuk definisi AEDT bila memakai ML/statistik/analitik/AI untuk memberi
  skor/klasifikasi/rekomendasi dan **secara substansial membantu atau
  menggantikan** keputusan manusia. Kewajiban: bias audit independen tahunan
  (selection/scoring rate + **impact ratio** per sex, race/ethnicity,
  intersectional), publikasi ringkasan, dan notifikasi kandidat 10 hari kerja.
  Audit pengawas NY (Des 2025) menilai penegakannya lemah, tetapi kewajiban
  tetap ada dan risiko gugatan perorangan tetap.
- **Title VII & EEOC:** panduan AI EEOC (Mei 2023) **dicabut** 27 Jan 2025 dan
  National Enforcement Plan Juni 2026 memprioritaskan penghapusan teori
  *disparate impact*. **Statuta Title VII tidak berubah** dan penggugat swasta
  tetap bisa menuntut; jangan menganggap risiko hilang.
- **California FEHA — Automated-Decision Systems (efektif 1 Okt 2025):**
  definisi sangat luas ("computational process yang membuat atau memfasilitasi
  keputusan manusia atas employment benefit"), mencakup scoring/ranking;
  diskriminasi langsung maupun dampak tetap dilarang, retensi data ADS 4 tahun,
  dan vendor dapat ikut bertanggung jawab. Labor Code 1520–1526.7 (SB 947)
  berlaku 1 Jul 2027.
- **Colorado:** SB 24-205 (AI Act) **dicabut dan diganti** SB 26-189 (ADMT,
  efektif 1 Jan 2027) yang lebih ringan: kewajiban transparansi/notice dan hak
  konsumen, tanpa impact assessment tahunan. Referensi lama di PRD sudah usang.

### 2.5 Yurisdiksi lain

- **Singapura:** TAFA dan Model AI Governance Framework bersifat non-binding;
  praktik baik tetap relevan untuk pasar SG.
- **Indonesia (khusus AI):** belum ada UU AI. Yang berlaku: SE Menkominfo
  9/2023 (etika AI, non-binding). Perpres Peta Jalan AI Nasional 2026–2029 dan
  Perpres Etika AI masih **draf** per November 2026; pantau sebelum klaim
  kepatuhan.

## 3. Matriks kewajiban vs kontrol yang sudah ada

| Kewajiban | Kontrol saat ini | Status |
|---|---|---|
| Human-in-the-loop, tanpa keputusan otomatis | AIR-1: tidak ada auto-reject/hire; skor hanya sinyal | ✅ |
| Transparansi skor + versi + bukti | AIR-2: `score_version`, `evidence[]`, halaman skor sendiri | ✅ |
| Hak developer (lihat, koreksi, opt-out, hapus) | AIR-3: `listed=false`, re-analisis, hapus akun + purge pipeline | ✅ (uji pgTAP 13) |
| Minimisasi data pipeline | D5: hanya login/stage/catatan; purge saat akun dihapus | ✅ |
| Tanpa inferensi atribut sensitif | AIR-5 | ✅ |
| Audit bias berkala | AIR-4: `bias_report_v0()` + evidence 10 Nov 2026 | 🟡 mekanisme ada, metodologi belum cukup (bagian 4) |
| DPIA / penilaian dampak | belum ada dokumen | ❌ |
| Dasar hukum & privacy notice profiling | belum ada LIA/notice khusus skor | ❌ |
| Klasifikasi AI Act + dokumentasi teknis | belum ada | ❌ |
| Audit bias independen (LL 144) | tidak dapat dipenuhi tanpa data sex/race | ❌ (batasi pasar) |
| Retensi data ADS (California) | log analisis ada, kebijakan retensi 4 tahun belum ditulis | ❌ |
| Notifikasi kandidat (LL 144/Colorado) | belum ada template | ❌ |

## 4. Tinjauan metodologi audit bias v0

Audit saat ini (`bias_report_v0`, `bias-audit.md`) menghitung n/mean/median/
p25/p75 per negara, bahasa, dan role, dengan masking n < 10 dan indikator
"median berbeda > 10 poin". Kekuatannya: agregat tanpa identitas, masking, dan
dapat diulang. Kelemahannya:

| # | Temuan | Dampak | Rekomendasi |
|---|---|---|---|
| F1 | Ambang "median > 10 poin" adalah heuristik tanpa dasar statistik | Tidak bisa membedakan sinyal dari derau; n kecil mudah memicu false alarm | Tambah interval kepercayaan (bootstrap/Wilson) dan laporkan selisih + CI, bukan hanya titik |
| F2 | Tidak ada **impact ratio** (selection/scoring rate) | Tidak sebanding dengan tolok ukur LL 144 / 4-5 rule EEOC | Hitung scoring rate pada ambang tetap (mis. skor ≥ 70) per grup dan impact ratio terhadap grup acuan |
| F3 | Masking n < 10 terlalu rendah untuk median yang stabil | Statistik grup 10–30 orang rapuh | Naikkan ambang pelaporan ke n ≥ 30; grup 10–29 ditandai "eksploratif" dengan CI lebar |
| F4 | 31 negara + 10 bahasa + 4 role ≈ 45 uji tanpa koreksi multiplisitas | Sekitar 2–3 temuan palsu diharapkan pada alpha 5% | Terapkan Benjamini–Hochberg (FDR 5%) dan laporkan q-value |
| F5 | Tidak ada atribut terlindungi (by design) | Tidak bisa disebut audit diskriminasi; tidak memenuhi LL 144 | Sebut sebagai "audit distribusi skor", bukan audit diskriminasi; bila pasar menuntut, kumpulkan self-ID sukarela dengan dasar hukum terpisah |
| F6 | Baseline hanya data sintetis, satu snapshot, satu `score_version` | Tidak menunjukkan perilaku pada populasi nyata atau antar waktu | Audit pada data beta nyata, kunci `score_version` + hash dataset, ulangi tiap kuartal dan setiap perubahan bobot |
| F7 | Tidak ada uji stabilitas temporal/geografis | Regresi halus (mis. perubahan bobot) tidak terdeteksi | Simpan skor historis per versi; bandingkan distribusi antar versi sebelum rilis |

Catatan positif: hasil 10 Nov 2026 menunjukkan mekanisme bekerja — grup yang
sengaja digeser -14 ter-flag (-12), dan tidak ada grup lain yang melewati
ambang, sehingga tidak ada klaim bias yang tidak berdasar.

## 5. Temuan kritis

- **K1 — Klasifikasi AI Act belum diputuskan.** Jika skor dianggap AI system,
  Discover masuk Annex III 4(a) dan wajib menyiapkan berkas risiko tinggi
  sebelum 2 Des 2027. Menunggu sampai 2027 berisiko: conformity assessment dan
  dokumentasi butuh waktu.
- **K2 — LL 144 tidak dapat dipenuhi model data saat ini.** Tanpa sex/race
  (dan pelaporan intersectional), tidak ada impact ratio yang sah. Jangan
  pasarkan untuk hiring di NYC.
- **K3 — Panduan EEOC dicabut, bukan hukumnya.** Title VII, ADEA, ADA, dan
  hukum negara bagian tetap berlaku; California FEHA ADS sudah efektif.
- **K4 — UU PDP Pasal 10 menuntut jalur keberatan yang nyata** atas pemrosesan
  otomatis; `listed=false` + koreksi skor harus terdokumentasi di privacy
  notice, bukan hanya ada di kode.
- **K5 — Filter negara berisiko menjadi proksi asal-usul nasional.** POL-8
  sudah menegaskan "domisili, bukan kewarganegaraan"; tambahkan panduan
  recruiter agar tidak memakai filter negara sebagai syarat diskriminatif.

## 6. Rencana aksi sebelum Discover eksternal

| ID | Aksi | Kriteria selesai | Pemilik |
|---|---|---|---|
| A1 | Pendapat hukum tertulis: apakah skor = AI system; peran provider/deployer; apakah Art. 6(3) berlaku | memo bertanggal, disimpan di `docs/legal/` | Legal |
| A2 | DPIA (GDPR Art. 35) + penilaian dampak UU PDP + LIA | dokumen disetujui, risiko residual diterima | Privasi |
| A3 | Perbarui Privacy Policy/ToS: skor = decision support, larangan pemakaian sebagai satu-satunya kriteria, tanggung jawab recruiter, hak keberatan | teks terbit + tercantum di onboarding | Legal/Produk |
| A4 | Audit bias v1: impact ratio, CI, FDR, n ≥ 30, dataset & versi terkunci | `bias_report_v1` + evidence pada data beta | Backend/Data |
| A5 | Larangan pemasaran untuk hiring di NYC dan pembatasan klaim di California sampai ada dasar hukum/data yang cukup | panduan penjualan + catatan produk | Produk |
| A6 | Template notifikasi kandidat (LL 144/Colorado) dan kebijakan retensi 4 tahun untuk data ADS | template + kebijakan retensi | Legal/Backend |
| A7 | System card: tujuan, batasan, metrik, data, versi, log perubahan bobot | dokumen versi 1 | Backend |
| A8 | Tinjauan berkala: audit kuartalan, pemantauan regulasi (Perpres AI, omnibus lanjutan) | jadwal + pemilik | Kepatuhan |

**Status A4 (10 Nov 2026): mesin selesai, evidence beta belum.**
`bias_report_v1` + `scripts/backend/bias-report-v1.ts` sudah menghitung impact
ratio, Wilson/Katz CI, dan Benjamini–Hochberg dengan masking n ≥ 30; evidence
sintetis ada di `evidence/bias-v1-2026-11-10.md` (39 kelompok, 1 adverse `NG`).
A4 baru tertutup setelah laporan yang sama dijalankan pada data beta dengan
dataset dan `score_version` terkunci.

Beta tertutup boleh jalan sekarang selama A3 (pengungkapan), A6 (retensi), dan
A7 (system card) selesai lebih dulu; A1–A2 wajib sebelum ada pengguna EU.

## 7. Batasan dokumen

- Bukan nasihat hukum; status regulasi diverifikasi pada 10 Nov 2026 dan dapat
  berubah (mis. Perpres AI Indonesia yang masih menunggu tanda tangan).
- Penilaian "bukan AI system" adalah argumen, bukan kesimpulan hukum.
- Data sintetis tidak mewakili populasi nyata; audit v0 hanya menguji mekanisme.
- Dokumen ini tidak menilai kontrak dagang, sanksi, atau kepatuhan toko aplikasi.

## 8. Sumber (diakses 10 Nov 2026)

- Regulation (EU) 2024/1689 (AI Act) — definisi Art. 3(1), Annex III 4(a),
  Art. 6(3): https://eur-lex.europa.eu/eli/reg/2024/1689/oj/eng
- Regulation (EU) 2026/1744 (Digital Omnibus on AI), tanggal berlaku baru:
  https://eur-lex.europa.eu/eli/reg/2026/1744/oj/eng
- Komisi Eropa, AI Act Service Desk — employment & FAQ penegakan:
  https://ai-act-service-desk.ec.europa.eu/en/employment-0 ,
  https://ai-act-service-desk.ec.europa.eu/en/ai-act/faq/when-does-enforcement-start
- NYC DCWP, Automated Employment Decision Tools (LL 144):
  https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page
- NY State Comptroller, audit penegakan LL 144 (Des 2025):
  https://www.osc.ny.gov/state-agencies/audits/2025/12/02/enforcement-local-law-144-automated-employment-decision-tools
- California Civil Rights Department, regulasi ADS (efektif 1 Okt 2025):
  https://calcivilrights.ca.gov/2025/06/30/civil-rights-council-secures-approval-for-regulations-to-protect-against-employment-discrimination-related-to-artificial-intelligence
- Status panduan AI EEOC (dicabut 27 Jan 2025) dan National Enforcement Plan
  2026: https://www.cooley.com/news/insight/2025/2025-02-21-gone-but-not-forgotten-federal-laws-still-apply-despite-guidance-disappearance-act ,
  https://www.eeoc.gov/sites/default/files/2026-06/NEP_-_signed.pdf
- Colorado SB 26-189 (menggantikan SB 24-205, efektif 1 Jan 2027):
  https://leg.colorado.gov/bills/sb26-189
- UU PDP 27/2022, Pasal 10: https://peraturan.bpk.go.id/Details/229798/uu-no-27-tahun-202
- PP 33/2026 (pelaksana UU PDP; diundangkan 16 Jul 2026, berlaku 16 Jan 2027):
  sumber sekunder https://www.dfdl.com/insights/content-hub/articles/ai-governance-indonesia —
  verifikasi teks resmi sebelum dijadikan dasar.
- SE Menkominfo 9/2023 dan status draf Perpres AI:
  https://aipolicytracker.org/jurisdictions/indonesia
