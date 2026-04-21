# Android Release Signing — copy-paste integration

The `android/` folder is generated locally by `npx cap add android` and is
**not** stored in this repo. After running that command, edit
`android/app/build.gradle` and merge the snippets below.

> ⚠️ **If "Generate Signed Bundle / APK" is greyed out in Android Studio**,
> see `BUILD_APK.md` at the repo root — that's almost always caused by a
> missing `signingConfigs.release` block (added below) or an unfinished
> Gradle sync.

---

## 1. At the very TOP of `android/app/build.gradle`

```gradle
// Load keystore.properties (gitignored) for release signing
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

## 2. Inside the `android { ... }` block

Replace the existing `defaultConfig` / `buildTypes` blocks with this. The
**critical** part for unlocking the Generate APK menu is `signingConfigs.release`
+ `buildTypes.release.signingConfig signingConfigs.release`.

```gradle
android {
    namespace "app.lovable.cbd25e4a769a42d6835afcaa159bbcc4"
    compileSdkVersion rootProject.ext.compileSdkVersion

    defaultConfig {
        applicationId "app.lovable.cbd25e4a769a42d6835afcaa159bbcc4"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile     file("${keystoreProperties['storeFile']}")
                storePassword keystoreProperties['storePassword']
                keyAlias      keystoreProperties['keyAlias']
                keyPassword   keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

## 3. Create `android/keystore.properties` (gitignored)

```properties
storeFile=app/auropay-release.keystore
storePassword=YOUR_STORE_PASSWORD
keyAlias=auropay
keyPassword=YOUR_KEY_PASSWORD
```

## 4. Generate the keystore (one-time)

```bash
cd android/app
keytool -genkey -v -keystore auropay-release.keystore \
  -alias auropay -keyalg RSA -keysize 2048 -validity 10000
```

## 5. Add to `android/.gitignore`

```
keystore.properties
app/*.keystore
app/*.jks
```

## 6. Build a signed APK / AAB from CLI (alternative to Android Studio)

```bash
cd android
./gradlew assembleRelease   # APK -> app/build/outputs/apk/release/
./gradlew bundleRelease     # AAB -> app/build/outputs/bundle/release/
```

## 7. Get the SHA-256 fingerprint for `assetlinks.json`

```bash
keytool -list -v -keystore android/app/auropay-release.keystore -alias auropay
```

Copy the `SHA256:` line into `public/.well-known/assetlinks.json`,
replacing `REPLACE_WITH_RELEASE_KEYSTORE_SHA256_FINGERPRINT`. Then
re-publish the Lovable site so Google can fetch the updated file at
<https://auro-pay.lovable.app/.well-known/assetlinks.json>.

## 8. Verify App Links

```bash
adb shell pm verify-app-links --re-verify app.lovable.cbd25e4a769a42d6835afcaa159bbcc4
adb shell pm get-app-links     app.lovable.cbd25e4a769a42d6835afcaa159bbcc4
```

You should see `verified` for `auro-pay.lovable.app`.
