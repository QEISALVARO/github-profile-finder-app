# Build & Download APK

APK dibangun di cloud lewat EAS, jadi tidak perlu Android Studio/Xcode. Hasil tiap build
adalah tautan unduhan `.apk` seperti `https://expo.dev/artifacts/eas/<hash>.apk`.

## Prasyarat (sekali saja)

- Sudah login: `npx eas-cli@latest login`
- Project sudah tertaut: `expo.owner` + `expo.extra.eas.projectId` ada di `app.json`
  (project: https://expo.dev/accounts/farrosalwarisi/projects/gitscope)

## Build APK

```bash
npm run build:apk
```

Sama dengan `npx eas-cli@latest build --platform android --profile preview`. Profile
`preview` di `eas.json` memakai `distribution: "internal"` + `android.buildType: "apk"`,
jadi hasilnya APK yang bisa langsung dipasang (bukan `.aab` untuk Play Store), dan
`autoIncrement` menaikkan `versionCode` tiap build sehingga APK baru bisa dipasang
menimpa versi sebelumnya.

Di akhir build, CLI mencetak dua tautan:

- **APK**: `https://expo.dev/artifacts/eas/<hash>.apk` — tautan unduhan langsung,
  bisa dibagikan ke siapa pun tanpa login Expo.
- **Halaman build**: `https://expo.dev/accounts/<akun>/projects/<slug>/builds/<id>` —
  tombol *Install*/*Download*, log build, dan status.

## Ambil ulang URL APK terakhir

```bash
npm run apk:url
```

Mencetak URL APK + halaman build dari build Android terakhir (butuh login EAS).
Jika build masih berjalan, skrip memberi tahu status dan tautan progresnya.

## Catatan

- APK internal distribution ditandatangani dengan keystore yang dikelola EAS
  (`npx eas-cli@latest credentials`). Keystore itu harus tetap sama agar update bisa
  menimpa instalasi lama.
- `production` tetap menghasilkan AAB untuk Play Store; jangan pakai profile itu kalau
  tujuannya membagikan file APK.
- Perangkat Android perlu mengizinkan "Install unknown apps" untuk memasang APK di
  luar Play Store.
