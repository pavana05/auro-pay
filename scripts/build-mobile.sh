#!/usr/bin/env bash
# AuroPay — one-shot mobile build helper
#
# Usage from repo root:
#   ./scripts/build-mobile.sh android        # build + sync Android
#   ./scripts/build-mobile.sh android open   # …then open in Android Studio
#   ./scripts/build-mobile.sh ios            # build + sync iOS (macOS only)
#   ./scripts/build-mobile.sh ios open       # …then open in Xcode
#   ./scripts/build-mobile.sh both           # build + sync both
#
# This wraps the same commands documented in BUILD_APK.md / BUILD_IPA.md so
# contributors don't need to remember every step.

set -euo pipefail

PLATFORM="${1:-both}"
ACTION="${2:-}"

cyan()  { printf '\033[36m%s\033[0m\n' "$*"; }
green() { printf '\033[32m%s\033[0m\n' "$*"; }
red()   { printf '\033[31m%s\033[0m\n' "$*" >&2; }

if [[ ! -f "package.json" ]]; then
  red "Run this from the repo root (no package.json here)."
  exit 1
fi

cyan "▸ Installing JS dependencies (npm ci if lockfile, else install)…"
if [[ -f "package-lock.json" ]]; then
  npm ci
else
  npm install
fi

cyan "▸ Building the web bundle (vite)…"
npm run build

build_android() {
  cyan "▸ Ensuring Android platform exists…"
  if [[ ! -d "android" ]] || [[ ! -f "android/build.gradle" ]]; then
    npx cap add android
  fi
  cyan "▸ Syncing dist/ + plugins into android/…"
  npx cap sync android
  green "✓ Android ready. Build a release AAB with:"
  echo "    cd android && ./gradlew bundleRelease"
  echo "  (See BUILD_APK.md for signing setup.)"
  if [[ "$ACTION" == "open" ]]; then
    cyan "▸ Opening Android Studio…"
    npx cap open android
  fi
}

build_ios() {
  if [[ "$(uname)" != "Darwin" ]]; then
    red "iOS builds require macOS with Xcode. Skipping."
    return 0
  fi
  cyan "▸ Ensuring iOS platform exists…"
  if [[ ! -d "ios" ]]; then
    npx cap add ios
  fi
  cyan "▸ Syncing dist/ + plugins into ios/…"
  npx cap sync ios
  green "✓ iOS ready. Archive in Xcode (Product ▸ Archive)."
  echo "  (See BUILD_IPA.md for signing + App Store submission.)"
  if [[ "$ACTION" == "open" ]]; then
    cyan "▸ Opening Xcode workspace…"
    npx cap open ios
  fi
}

case "$PLATFORM" in
  android) build_android ;;
  ios)     build_ios ;;
  both)    build_android; build_ios ;;
  *)
    red "Unknown platform: $PLATFORM (expected: android | ios | both)"
    exit 1
    ;;
esac

green ""
green "═══════════════════════════════════════════════════════════════"
green " ✅  Mobile build prep complete."
green "═══════════════════════════════════════════════════════════════"
