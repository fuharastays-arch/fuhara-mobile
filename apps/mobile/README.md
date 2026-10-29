# Fuhara Stays mobile beta

Native Expo/React Native client for Fuhara's STAGING backend. The app is an npm workspace inside the product monorepo so it can import the validation, parsing, money, catalog, KYC, host and support contracts from `@fuhara/core` without copying business rules.

## Safety boundary

- `src/lib/env.ts` rejects every Supabase project except `xhneambzjwqqwhtcnytq`.
- Only the Supabase publishable key may be bundled. A service-role key or payment/payout secret is never accepted.
- Booking, KYC, availability and host decisions use existing RLS/RPC enforcement.
- Payment UI mirrors backend state. Payments and payout execution are disabled in app configuration.
- There are no admin, mark-paid, payout retry, hold-clear or settlement controls.

## Local Android setup (Windows)

1. Copy `.env.example` to `.env.local` and replace only the STAGING publishable key.
2. From the repository root run `npm install`.
3. Start an Android Studio emulator with Google Play services, then run `npm run mobile:android`.

Use `npm run mobile:start -- --tunnel` for a physical device on another network. Remote push tokens require a native build, a real EAS project id, and the reviewed least-privilege STAGING token-registration RPC. Delivery remains scaffold-only until those pieces exist.

## Android internal beta

Current Android identity:

- Display name: `Fuhara Stays`
- Package: `com.fuhara.mobile.staging`
- Version: `0.7.5` (`versionCode` 75)
- STAGING Supabase ref: `xhneambzjwqqwhtcnytq`

Create the local internal-beta signing key once with `node scripts/create-internal-beta-keystore.cjs`. The generated `.credentials` directory is ignored by Git; back it up in an approved secret store because future updates must use the same key. The script never prints passwords.

After `npx expo prebuild --platform android --no-install`, build from `android` on Windows:

```powershell
.\gradlew.bat assembleRelease '-PreactNativeArchitectures=arm64-v8a' --no-daemon
.\gradlew.bat assembleRelease '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64' --no-daemon
.\gradlew.bat bundleRelease '-PreactNativeArchitectures=armeabi-v7a,arm64-v8a,x86,x86_64' --no-daemon
```

Install the arm64 APK on a connected phone with:

```powershell
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" devices -l
& "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe" install -r "C:\path\to\Fuhara-Stays-0.7.5-75-staging-arm64-v8a-release.apk"
```

The EAS `preview` APK and `play-internal` AAB profiles are prepared, but cloud distribution remains unavailable until the project is initialized with a real EAS project id. Do not submit the AAB to Google Play without explicit release approval.

## Checks

Run `npm run mobile:lint`, `npm run mobile:typecheck`, `npm run mobile:test`, `npm run mobile:doctor`, and `npm run mobile:export` from the repository root.

## iOS

The source and EAS profile are cross-platform. A local iOS Simulator requires macOS/Xcode. After an Expo project id and Apple credentials are configured, use `npx eas-cli@latest build --profile preview --platform ios`; do not submit it to TestFlight or the App Store without explicit approval.
