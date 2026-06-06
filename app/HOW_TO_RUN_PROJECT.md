# How to Run the ProPhone App

All commands run from the `app/` directory unless stated otherwise.

```bash
cd /path/to/prophone-vite/app
```

---

## Option 1 — iOS Simulator (Xcode, no device needed)

### Requirements
- Mac with Xcode installed
- iOS Simulator included with Xcode

### Steps

```bash
npx expo run:ios
```

Expo compiles the native code using your local Xcode and launches the iOS Simulator automatically. First run takes ~3–5 minutes. Subsequent runs take ~1–2 minutes.

---

## Option 2 — Physical iPhone (Xcode)

### Requirements
- Mac with Xcode installed
- iPhone connected via USB
- Apple ID (free account works for personal testing)

### Steps

**1. Generate the native iOS project (first time only)**

```bash
npx expo run:ios
```

This creates an `ios/` folder in the project.

**2. Open the project in Xcode**

```bash
open ios/ProPhone.xcworkspace
```

Always open `.xcworkspace`, not `.xcodeproj`.

**3. Configure signing in Xcode**

- Select your iPhone from the device dropdown at the top toolbar
- Go to the **ProPhone** target → **Signing & Capabilities** tab
- Set **Team** to your Apple ID
- Xcode will auto-generate a provisioning profile

**4. Build and install**

- Click the **Play (▶)** button in Xcode
- The app installs on your iPhone automatically

**5. Trust the developer on your iPhone**

- Go to **Settings → General → VPN & Device Management**
- Tap your Apple ID and hit **Trust**

**6. Start the dev server**

```bash
npx expo start --dev-client
```

Open the **ProPhone** app on your iPhone and scan the QR code.

---

## Option 3 — Android Device or Emulator (Local Build)

### Requirements
- Android Studio installed
- Android SDK installed (comes with Android Studio)
- Android device with USB debugging enabled, OR an Android Emulator set up in Android Studio

### Steps

**1. Build and run**

```bash
npx expo run:android
```

Expo compiles using Gradle and installs the APK directly on the connected device or running emulator.

**2. Start the dev server (if not auto-started)**

```bash
npx expo start --dev-client
```

Open the **ProPhone** app and scan the QR code.

### Enable USB Debugging on your Android phone

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times to unlock Developer Options
3. Go to **Settings → Developer Options** → enable **USB Debugging**
4. Connect phone via USB and accept the prompt on your phone

---

## Option 4 — EAS Cloud Build (Android APK, no Android Studio needed)

Use this if you don't have Android Studio or want to share the app with someone else.

### Requirements
- Expo account at https://expo.dev
- EAS CLI installed: `npm install -g eas-cli`

### Steps

**1. Log in**

```bash
eas login
```

**2. Build the APK**

```bash
eas build --profile development --platform android
```

- Select **Generate a new keystore** when prompted
- Build runs on Expo's cloud (~5–10 minutes)
- Download the `.apk` from the link EAS provides

**3. Install the APK on your Android phone**

- Open the download link on your phone
- Allow installs from unknown sources when prompted
- Install the app

**4. Start the dev server**

```bash
npx expo start --dev-client
```

Open the **ProPhone** app and scan the QR code.

---

## Option 5 — Web Browser

```bash
npx expo start --web
```

Opens the app in your browser at `http://localhost:8081`. Useful for quick UI checks — not all native features work in the browser.

---

## Daily Development Workflow (after first setup)

Once the app is installed on your device, you only need to start the dev server:

```bash
npx expo start --dev-client
```

Open the app → scan the QR code → done. Changes hot-reload instantly.

Use `--tunnel` if your phone and computer are on different networks:

```bash
npx expo start --dev-client --tunnel
```

---

## When to Rebuild the Native App

You need to re-run `npx expo run:ios` or `npx expo run:android` (or rebuild via EAS) only when you:

- Add a package that contains native code (e.g. `expo-camera`, `expo-notifications`)
- Change `app.json` fields like `name`, `icon`, `permissions`, or `bundleIdentifier`

For all TypeScript/JavaScript changes, the dev server hot-reload is enough.

---

## Comparison Table

| Option | Platform | Build Location | Speed | Requires |
|---|---|---|---|---|
| `npx expo run:ios` | iOS Simulator | Local (Xcode) | Fast | Mac + Xcode |
| Xcode + iPhone | Physical iPhone | Local (Xcode) | Fast | Mac + Xcode + Apple ID |
| `npx expo run:android` | Android | Local (Gradle) | Fast | Android Studio |
| EAS Cloud Build | Android APK | Expo Cloud | ~10 min | Expo account |
| `npx expo start --web` | Browser | None | Instant | Nothing extra |

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Phone can't connect to dev server | Make sure phone and Mac are on the same Wi-Fi |
| "Unable to resolve host" | Add `--tunnel` flag to `expo start` |
| iOS build fails with signing error | Set Team in Xcode → Signing & Capabilities |
| Android build fails | Run `npx expo doctor` to check for issues |
| App crashes on launch | Run `npx expo start --dev-client` and check terminal logs |
| Xcode says "No devices" | Unlock your iPhone and accept the trust prompt |
| APK won't install | Settings → Security → allow unknown sources |
