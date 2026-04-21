# Build a Release IPA (iOS / App Store)

The mirror of `BUILD_APK.md`, for iOS. Run on a **macOS machine with
Xcode 15+** — Apple does not allow IPA builds from Linux or Windows.

---

## 0. Prerequisites (one-time)

- macOS 13 (Ventura) or newer
- **Xcode 15+** from the Mac App Store (includes the iOS 17 SDK)
- **CocoaPods** — `sudo gem install cocoapods` (or via Homebrew)
- **Apple Developer Program membership** ($99/yr) — required to sign + ship
- **Team ID** — found at <https://developer.apple.com/account> → "Membership"
- An **App Store Connect** record for AuroPay (create at
  <https://appstoreconnect.apple.com> → My Apps → +)

---

## 1. Build the web bundle and add the iOS platform

From the repo root on your Mac:

```bash
npm install
npm run build              # outputs dist/
npx cap add ios            # creates ios/ folder (one-time)
npx cap sync ios           # copies dist/ + plugins into ios/App/App/public/
```

> The repo's `capacitor.config.ts` ships with the dev `server.url` block
> **commented out**, so the IPA bundles your local `dist/`. ✅

---

## 2. Open the Xcode workspace

```bash
npx cap open ios
```

That opens `ios/App/App.xcworkspace` (NOT `App.xcodeproj` — always the
workspace, otherwise CocoaPods linking breaks).

---

## 3. Configure signing (one-time)

In Xcode:

1. Click the **App** target in the left navigator
2. **Signing & Capabilities** tab
3. **Team:** pick your Apple Developer team
4. **Bundle Identifier:** must match `appId` in `capacitor.config.ts` →
   `app.lovable.cbd25e4a769a42d6835afcaa159bbcc4`
5. ✅ Check **Automatically manage signing** (recommended) — Xcode will
   create the provisioning profile on demand

If your bundle ID is in use by another developer, change it to something
unique like `com.yourcompany.auropay` and update `capacitor.config.ts` to
match, then re-run `npx cap sync ios`.

---

## 4. Set the version & build number

In Xcode → App target → **General** tab:

- **Version:** `1.0.0` (semver, shown on the App Store)
- **Build:** `1` (must increase for every TestFlight / App Store upload)

Or edit `ios/App/App.xcodeproj/project.pbxproj` and look for
`MARKETING_VERSION` and `CURRENT_PROJECT_VERSION`.

---

## 5. Archive + Upload to App Store Connect

1. Top of Xcode, set the run destination to **Any iOS Device (arm64)**
   (NOT a simulator — simulators can't archive)
2. **Product ▸ Archive**
3. Wait ~3–10 min while Xcode builds the release archive
4. Organizer window opens → click your archive → **Distribute App**
5. Pick **App Store Connect → Upload**
6. Accept the defaults, sign with your team, click **Upload**

The build appears in App Store Connect → TestFlight in 5–30 minutes
(after Apple's processing). From there you can:
- Add it to a TestFlight group for internal/external testers
- Submit it for App Store review

---

## 6. CLI alternative (no Xcode UI needed)

```bash
cd ios/App

# Build the archive
xcodebuild -workspace App.xcworkspace -scheme App \
  -configuration Release -destination "generic/platform=iOS" \
  -archivePath build/App.xcarchive archive

# Export the IPA
xcodebuild -exportArchive \
  -archivePath build/App.xcarchive \
  -exportPath build/ipa \
  -exportOptionsPlist ExportOptions.plist
```

You'll need an `ExportOptions.plist` — generate one once via Xcode's
Organizer → Distribute App → "Export" and copy the resulting plist into
`ios/App/ExportOptions.plist`.

---

## 7. Universal Links (https deep links)

iOS reads deep-link config from
<https://auro-pay.lovable.app/.well-known/apple-app-site-association> —
already shipped in `public/.well-known/apple-app-site-association`.

Before publishing, edit that file and replace
`REPLACE_WITH_TEAM_ID` with your Apple Team ID, e.g. `A1B2C3D4E5`.
Then re-publish the Lovable site so Apple can fetch it.

In Xcode → **Signing & Capabilities ▸ + Capability ▸ Associated Domains**
and add: `applinks:auro-pay.lovable.app`

Verify after install:

```bash
xcrun simctl openurl booted https://auro-pay.lovable.app/home
# → should open the app, not Safari
```

---

## 8. App Store Review prep

Before clicking "Submit for Review":

- [ ] Privacy policy URL filled in (App Store Connect → App Info)
- [ ] Age rating questionnaire complete (expect 4+ for AuroPay)
- [ ] Screenshots: 6.7" iPhone (1290×2796), 6.5" iPhone (1242×2688) —
      minimum 3 each, max 10
- [ ] App icon (1024×1024, no alpha, no rounded corners — Apple rounds it)
- [ ] Test account credentials in **App Review Information**
- [ ] India financial-services disclosures match Play Store filing
- [ ] All `NSCameraUsageDescription`, `NSMicrophoneUsageDescription`,
      `NSFaceIDUsageDescription` strings in `ios/App/App/Info.plist` are
      **user-friendly** — Apple rejects boilerplate

---

## Related docs

- `BUILD_APK.md` — Android equivalent
- `ANDROID_APP_LINKS.md` — verifying https deep links on Android
- `DEEP_LINKS.md` — `auropay://` custom scheme
- `PLAY_STORE_CHECKLIST.md` — Google Play submission checklist
