# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

### Other setup steps

- To set up ESLint for linting, run `npx expo lint`, or follow our guide on ["Using ESLint and Prettier"](https://docs.expo.dev/guides/using-eslint/)
- If you'd like to set up unit testing, follow our guide on ["Unit Testing with Jest"](https://docs.expo.dev/develop/unit-testing/)
- Learn more about the TypeScript setup in this template in our guide on ["Using TypeScript"](https://docs.expo.dev/guides/typescript/)

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Sumber data: mock vs api (FE-2)

Setiap domain punya flag sendiri di `.env` (lihat `.env.example`):

```
EXPO_PUBLIC_DS_AUTH=mock      # auth   → GitHub OAuth via Supabase
EXPO_PUBLIC_DS_FEED=mock      # feed   → menunggu BE-3
EXPO_PUBLIC_DS_ANALYSIS=mock  # analysis → Edge Function analyze-developer
EXPO_PUBLIC_DS_TALENT=mock    # talent → menunggu BE-4
EXPO_PUBLIC_DS_CHAT=mock      # chat   → menunggu BE-5
EXPO_PUBLIC_DS_REPORTS=mock   # reports → menunggu BE-6
```

- **Default `mock`**: aplikasi berjalan penuh tanpa backend, tanpa jaringan, dan
  tanpa variabel Supabase. Nilai flag yang tidak dikenal jatuh ke `mock` dengan
  peringatan di konsol.
- **Mode `api`** butuh stack lokal hidup (`make up`), Edge Functions berjalan,
  dan `EXPO_PUBLIC_SUPABASE_URL` + `EXPO_PUBLIC_SUPABASE_ANON_KEY` terisi.
  Klien Supabase dibuat malas — hanya saat minimal satu domain berflag `api`.
- Domain yang backend-nya belum siap akan menampilkan pesan
  "Fitur ini belum tersedia di backend", bukan data palsu.
- Skenario uji Analysis tanpa backend: buka `/explore/analysis?login=__stale__`
  (juga `__notfound__`, `__ratelimited__`, `__error__`, `__empty__`,
  `__allforks__`).
