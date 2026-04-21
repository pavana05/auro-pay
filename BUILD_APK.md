# Build a Release APK / AAB

This guide gets you from a fresh `git pull` to a signed APK installable on
any Android device, plus how to fix the **"Generate Signed Bundle / APK"
menu being greyed out** in Android Studio.

---

## 0. Prerequisites (one-time)

- Node 18+, JDK 17, Android Studio (Hedgehog or newer)
- Android SDK 34 + Build Tools 34.0.0 installed via SDK Manager
- A release keystore (see `android/app/build.gradle.signing-snippet.md` §4)

---

## 1. Build the web bundle and sync to Android

```bash
npm install
npm run build              # outputs dist/
npx cap sync android       # copies dist/ + plugins into android/app/src/main/assets/
```

> If you don't have an `android/` folder yet, run `npx cap add android` first.
> Then **immediately** apply the signing snippet from
> `android/app/build.gradle.signing-snippet.md` — the menu item will stay
> greyed out until you do.

The repo's `capacitor.config.ts` ships with the `server.url` block
**commented out**, so `npx cap sync` will bundle your local `dist/` into
the APK instead of pointing at the Lovable sandbox. ✅

---

## 2. Open in Android Studio

```bash
npx cap open android
```

Wait for Gradle sync to finish (bottom-right progress bar). Don't touch
the Build menu until you see **"Gradle sync finished"**.

---

## 3. Generate the signed APK / AAB

**Build menu → Generate Signed Bundle / APK…**

- Choose **Android App Bundle** (for Play Store) or **APK** (for sideload)
- Select your keystore (`android/app/auropay-release.keystore`)
- Enter store + key passwords
- Build variant: **release**
- Click **Create**

Output lands in:
- AAB: `android/app/build/outputs/bundle/release/app-release.aab`
- APK: `android/app/build/outputs/apk/release/app-release.apk`

---

## 🚑 Fix: "Generate Signed Bundle / APK" is greyed out

This menu item is disabled when **any** of the following is true. Check in order:

### ① Gradle sync hasn't finished (or failed)
- Look at the bottom-right status bar. If it says "Sync failed" or is still
  spinning, the menu stays disabled.
- **Fix:** Click **File ▸ Sync Project with Gradle Files**. Wait until done.
- If sync fails, open the **Build** tool window and read the error. Most
  common: missing SDK 34 → install it via **Tools ▸ SDK Manager**.

### ② No `signingConfigs.release` block in `app/build.gradle`
- This is the #1 cause on a freshly-generated `android/` folder.
- **Fix:** Apply §1 + §2 of `android/app/build.gradle.signing-snippet.md`,
  then **File ▸ Sync Project with Gradle Files** again.

### ③ Build Variant set to `debug` only
- Some menu states hide the option when no signed-buildable variant exists.
- **Fix:** Open **Build ▸ Select Build Variant…** and confirm `release`
  appears in the dropdown for `:app`. If it doesn't, your `buildTypes`
  block is broken — re-apply the snippet.

### ④ Stale Gradle / IDE cache
- **Fix:** **File ▸ Invalidate Caches… ▸ Invalidate and Restart**.
  Then re-sync Gradle.

### ⑤ `android/` folder out of sync with the JS bundle
- **Fix:** From repo root: `npm run build && npx cap sync android`,
  then re-open Android Studio.

### ⑥ JDK mismatch
- Capacitor 6+ requires JDK 17. JDK 11 or 21 will fail sync.
- **Fix:** **File ▸ Settings ▸ Build, Execution, Deployment ▸ Build Tools ▸ Gradle ▸ Gradle JDK** → set to 17.

After any of the above, the menu item should be clickable within 5 seconds
of Gradle sync finishing.

---

## 4. CLI alternative (no Android Studio UI needed)

```bash
cd android
./gradlew clean
./gradlew bundleRelease     # AAB for Play Store
./gradlew assembleRelease   # APK for sideload
```

This bypasses the IDE entirely and is the most reliable way to verify your
signing config works.

---

## 5. Install the APK on a device for testing

```bash
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

Or transfer the `.apk` file to the phone and tap to install (you'll need
to allow "Install from unknown sources" once).

---

## 6. Going back to dev hot-reload

When you want to iterate again with live reload from the Lovable sandbox:

1. Open `capacitor.config.ts`
2. **Uncomment** the `server` block near the top
3. `npx cap sync android`
4. Re-run from Android Studio (debug build is fine)

---

## Related docs

- `android/app/build.gradle.signing-snippet.md` — the exact `build.gradle` edits
- `ANDROID_APP_LINKS.md` — verifying https deep links open in the app
- `DEEP_LINKS.md` — auropay:// custom scheme + intent filters
- `PLAY_STORE_CHECKLIST.md` — pre-submission checklist
