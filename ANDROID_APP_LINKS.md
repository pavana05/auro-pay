# Android App Links Verification

This file documents how to enable **silent** deep-link handoff between the
website (`https://auro-pay.lovable.app/...`) and the installed Android app —
no browser disambiguation chooser, no "Open with…" dialog.

## How it works

1. The app's `AndroidManifest.xml` declares an intent filter with
   `android:autoVerify="true"` for `https://auro-pay.lovable.app/*` (see
   `DEEP_LINKS.md`).
2. When the app is installed, Android fetches
   `https://auro-pay.lovable.app/.well-known/assetlinks.json`.
3. Android compares the `sha256_cert_fingerprints` in that file against the
   signing certificate of the installed APK.
4. If they match, every `https://auro-pay.lovable.app/...` link opens
   **directly** in the app, bypassing the chooser.

## Generating your SHA-256 fingerprint

Run this against the release keystore you use to sign the Play Store APK
(NOT the debug keystore — that one is per-machine):

```bash
keytool -list -v \
  -keystore /path/to/release.keystore \
  -alias <your-key-alias> \
  -storepass <store-password> \
  -keypass <key-password> \
  | grep "SHA256:"
```

You'll get a line like:
```
SHA256: AB:CD:EF:01:23:...:99
```

Copy the whole `AB:CD:...:99` value (colons and all) and paste it into
`public/.well-known/assetlinks.json`, replacing
`REPLACE_WITH_RELEASE_KEYSTORE_SHA256_FINGERPRINT`.

### Already published to Play Store?

If your app is enrolled in **Play App Signing** (the default for new
Play Store apps), Google holds your real signing key. Get the correct
fingerprint from:

> Play Console → Your app → Setup → App integrity → App signing key
> certificate → SHA-256 certificate fingerprint

That value is what Android will see at install time, so that's the one
that must appear in `assetlinks.json`.

## Verifying it works

After deploying the updated `assetlinks.json`:

1. Confirm the file is reachable at
   `https://auro-pay.lovable.app/.well-known/assetlinks.json` and returns
   `Content-Type: application/json`.
2. Use Google's verifier:
   ```
   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://auro-pay.lovable.app&relation=delegate_permission/common.handle_all_urls
   ```
3. Reinstall the app on a test device (verification only runs at install).
4. Tap any `https://auro-pay.lovable.app/...` link in Gmail/SMS — the app
   should open directly with no chooser.

## Until the fingerprint is real

While `assetlinks.json` still contains the placeholder, Android App Links
will **not verify**, so HTTPS deep links will fall back to the browser
chooser. The custom-scheme deep link (`auropay://...`) and the
`intent://...` URL used by `WebAppGate` will still work — they just may
prompt the user to choose between the app and the browser the first time.
