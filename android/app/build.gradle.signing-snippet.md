# Android Release Signing — manual integration

The `android/` folder is generated locally by `npx cap add android` and is
not stored in this repo. After running that command, edit
`android/app/build.gradle` and merge the snippets below.

---

## 1. At the very TOP of `android/app/build.gradle`

// Load keystore.properties (gitignored) for release signing
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

apply plugin: 'com.android.application'

android {
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
                storeFile file("${keystoreProperties['storeFile']}")
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
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

## 3. Add to `android/.gitignore`

keystore.properties
app/*.keystore
app/*.jks

## 4. Build a signed APK / AAB from CLI

cd android
./gradlew assembleRelease   # APK -> app/build/outputs/apk/release/
./gradlew bundleRelease     # AAB -> app/build/outputs/bundle/release/

## 5. Get the SHA-256 fingerprint for assetlinks.json

keytool -list -v -keystore android/app/auropay-release.keystore -alias auropay

Copy the SHA256 line and paste it (without colons OR with colons — both
work) into public/.well-known/assetlinks.json, replacing
REPLACE_WITH_RELEASE_KEYSTORE_SHA256_FINGERPRINT. Then re-publish the
Lovable site so Google can fetch the updated file at
https://auro-pay.lovable.app/.well-known/assetlinks.json.

## 6. Verify App Links

adb shell pm verify-app-links --re-verify app.lovable.cbd25e4a769a42d6835afcaa159bbcc4
adb shell pm get-app-links     app.lovable.cbd25e4a769a42d6835afcaa159bbcc4

You should see verified for auro-pay.lovable.app. Tapping any
https://auro-pay.lovable.app/* link will then open AuroPay directly,
with no chooser dialog.
