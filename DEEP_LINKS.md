# AuroPay — Production Android APK Build Guide

This guide walks through generating a release-ready Android APK with the
proper app icon, splash screen, and deep links.

---

## 1. One-time setup (your local machine)

> Lovable's cloud sandbox cannot run `gradle` / Android Studio. The steps
> below are run **on your own machine** after exporting the project to GitHub
> and `git clone`-ing it locally.

```bash
# Install dependencies
npm install

# Add the Android platform (creates the android/ folder)
npx cap add android
```

You should now have an `android/` directory in the project root. Commit it.

---

## 2. Generate icons & splash screens

The `resources/` folder contains three high-resolution source images:

| File                          | Purpose                             |
| ----------------------------- | ----------------------------------- |
| `resources/icon.png`          | 1024×1024 launcher icon (legacy)    |
| `resources/icon-foreground.png` | 1024×1024 transparent foreground (adaptive icon) |
| `resources/splash.png`        | 1024×1024 splash screen artwork     |

Run **once** (and again whenever you change those source files):

```bash
npx capacitor-assets generate \
  --android \
  --iconBackgroundColor '#0a0c0f' \
  --iconBackgroundColorDark '#0a0c0f' \
  --splashBackgroundColor '#0a0c0f' \
  --splashBackgroundColorDark '#0a0c0f'
```

This populates every density bucket under
`android/app/src/main/res/mipmap-*` and `android/app/src/main/res/drawable-*`
with correctly sized launcher icons (round + adaptive) and splash images.

---

## 3. Configure deep links

Open `android/app/src/main/AndroidManifest.xml` and inside the
`MainActivity` `<activity>` tag, add the following two intent filters
(directly after the existing `<intent-filter>` containing
`android.intent.action.MAIN`):

```xml
<!-- Custom scheme: auropay:// -->
<intent-filter android:autoVerify="false">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="auropay" />
</intent-filter>

<!-- HTTPS App Links: https://auro-pay.lovable.app/* -->
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="auro-pay.lovable.app" />
</intent-filter>
```

**App Links verification (optional but recommended):** to make
`https://auro-pay.lovable.app/...` open *directly* in the app without the
browser disambiguation dialog, host an
[`assetlinks.json`](https://developer.android.com/training/app-links/verify-android-applinks)
at `https://auro-pay.lovable.app/.well-known/assetlinks.json`.

The runtime handler is already wired in `src/App.tsx` via
`@capacitor/app` `appUrlOpen` — incoming deep links are parsed and routed
through React Router.

---

## 4. Build a production APK

### a) Disable the dev live-reload server

In `capacitor.config.ts`, **comment out** the entire `server: { ... }` block.
Production APKs must serve the bundled `dist/` build, not load from the
Lovable sandbox.

### b) Build & sync

```bash
npm run build              # Vite production bundle → dist/
npx cap sync android       # Copies dist/ + plugins into android/
```

### c) Open in Android Studio

```bash
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync to finish.
2. **Build → Generate Signed Bundle / APK → APK**.
3. Create or select a keystore (keep it safe — same key required for every
   future update).
4. Choose **release** variant, then **Finish**.

The signed APK is written to:
`android/app/build/outputs/apk/release/app-release.apk`

### d) Install on a device

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

---

## 5. Re-enable dev mode

When you're ready to iterate again, **uncomment** the `server` block in
`capacitor.config.ts` and re-run `npx cap sync android`. The app will then
hot-reload from the Lovable sandbox URL.
