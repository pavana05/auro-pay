# 📱 Make AuroPay Downloadable — Master Guide

You want a real native app that users can install from **Google Play** and the
**Apple App Store**. Everything you need is already in this repo — this doc is
the table of contents.

---

## ✅ What's already wired up

| Piece | File | Status |
|---|---|---|
| Capacitor config (Android + iOS, splash, status bar, deep links) | `capacitor.config.ts` | ✅ Ready |
| Android signing snippet | `android/app/build.gradle.signing-snippet.md` | ✅ Ready |
| Android release-build CI (signed AAB) | `.github/workflows/release-aab.yml` | ✅ Ready |
| Android → Play Console upload CI | `.github/workflows/upload-play.yml` | ✅ Ready |
| iOS release-build CI (signed IPA) | `.github/workflows/release-ipa.yml` | ✅ Ready |
| Android App Links (`https://...` opens app) | `public/.well-known/assetlinks.json` | ⚠️ Needs SHA-256 |
| iOS Universal Links | `public/.well-known/apple-app-site-association` | ⚠️ Needs Team ID |
| App icons + splash | `resources/` + `capacitor-assets.config.json` | ✅ Ready |
| Push notifications | `@capacitor/push-notifications` + `send-push-notification` edge fn | ✅ Ready |
| Biometric auth | `@aparajita/capacitor-biometric-auth` + `src/lib/biometric.ts` | ✅ Ready |
| One-shot build script | `scripts/build-mobile.sh` | ✅ Ready |

---

## 🚀 The 3-step happy path (Android first, iOS later)

### Step 1 — Get the code on your machine

The Lovable sandbox can't run Android Studio or Xcode, so you need the
project locally.

1. Click **Export to GitHub** (top-right in Lovable)
2. `git clone` the repo
3. `cd auro-pay && npm install`

### Step 2 — Build for Android

```bash
./scripts/build-mobile.sh android open
```

That runs `npm run build` → `npx cap add android` (if needed) →
`npx cap sync android` → opens Android Studio.

In Android Studio:
1. Wait for Gradle sync to finish
2. Apply the snippet in [`android/app/build.gradle.signing-snippet.md`](./android/app/build.gradle.signing-snippet.md)
3. **Build ▸ Generate Signed Bundle / APK ▸ Android App Bundle**
4. Upload the `.aab` to [Google Play Console](https://play.google.com/console)
   → Internal testing → roll out

Detailed walkthrough: [`BUILD_APK.md`](./BUILD_APK.md)
Pre-submission checklist: [`PLAY_STORE_CHECKLIST.md`](./PLAY_STORE_CHECKLIST.md)

### Step 3 — Build for iOS (Mac required)

```bash
./scripts/build-mobile.sh ios open
```

In Xcode:
1. Pick your Apple Developer team in **Signing & Capabilities**
2. **Product ▸ Archive**
3. Organizer → Distribute App → App Store Connect → Upload

Detailed walkthrough: [`BUILD_IPA.md`](./BUILD_IPA.md)

---

## 🤖 The fully-automated path (CI builds for you)

Once you've pushed to GitHub:

1. Add these GitHub Actions secrets (Repository → Settings → Secrets):

   **Android:**
   - `ANDROID_KEYSTORE_BASE64` — `base64 -i upload-keystore.jks`
   - `ANDROID_KEYSTORE_PASSWORD`
   - `ANDROID_KEY_ALIAS`
   - `ANDROID_KEY_PASSWORD`
   - `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` *(only if auto-uploading to Play)*

   **iOS:**
   - `APPLE_DEVELOPER_TEAM_ID`
   - `APPLE_BUNDLE_IDENTIFIER`
   - `APPLE_CERTIFICATE_BASE64` — base64 of your distribution `.p12`
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_PROVISIONING_PROFILE_BASE64`
   - `APPLE_KEYCHAIN_PASSWORD` *(any throwaway value)*

2. Tag a release:

   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. Both `release-aab.yml` and `release-ipa.yml` fire automatically. Signed
   `.aab` and `.ipa` are attached to the GitHub Release in ~10 minutes.

4. The Android AAB also auto-uploads to Play Console (Internal Testing,
   draft state) via `upload-play.yml`.

---

## 🔗 Make https links open the app (one-time setup)

After your first signed build:

### Android

```bash
# From repo root
keytool -list -v -keystore android/app/auropay-release.keystore -alias auropay
# Copy the SHA256 line and paste into:
# public/.well-known/assetlinks.json
```

Re-publish the Lovable site so Google can fetch the updated file at
<https://auro-pay.lovable.app/.well-known/assetlinks.json>.

Verify: [`ANDROID_APP_LINKS.md`](./ANDROID_APP_LINKS.md)

### iOS

Edit `public/.well-known/apple-app-site-association` and replace
`REPLACE_WITH_TEAM_ID` with your Apple Team ID (e.g. `A1B2C3D4E5`).
Re-publish. In Xcode, add the **Associated Domains** capability with
`applinks:auro-pay.lovable.app`.

---

## 📚 Doc index

| Doc | What's in it |
|---|---|
| [`BUILD_APK.md`](./BUILD_APK.md) | Detailed Android build + the "Generate Signed APK greyed out" troubleshooting |
| [`BUILD_IPA.md`](./BUILD_IPA.md) | Detailed iOS build, Xcode signing, App Store Connect upload |
| [`PLAY_STORE_CHECKLIST.md`](./PLAY_STORE_CHECKLIST.md) | Complete pre-submission checklist for Google Play |
| [`ANDROID_APP_LINKS.md`](./ANDROID_APP_LINKS.md) | Verifying that `https://auro-pay.lovable.app/...` opens in the app |
| [`DEEP_LINKS.md`](./DEEP_LINKS.md) | `auropay://` custom-scheme deep links |
| [`README.md`](./README.md) | Project overview |

---

## ❓ "Can users download it from a link right now?"

**Right now, today** — only via the published web app at
<https://auro-pay.lovable.app>. That URL is fully responsive and works in
any mobile browser, but it's not yet a Play Store / App Store listing.

**To get a Play Store / App Store link**, follow Step 1–3 above. From a
fresh `git clone` to "available on the Play Store", expect:
- ~2 hours of build + signing setup
- ~1–7 days for Google review
- ~1–3 days for Apple review

There's no shortcut around the store reviews — Google and Apple both
require it for any new listing.
