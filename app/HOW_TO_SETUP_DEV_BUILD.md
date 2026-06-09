# How to Set Up a Development Build (Expo SDK 56+)

Use this guide when Expo Go shows "Project is incompatible" — SDK 56+ requires a development build instead of Expo Go.

---

## Prerequisites

- Node.js installed
- Android phone with USB debugging or a physical device on the same Wi-Fi
- Expo account at https://expo.dev

---

## One-Time Setup

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Log in to Expo

```bash
eas login
```

### 3. Go into the app directory

```bash
cd /path/to/prophone-vite/app
```

### 4. Link the project to your Expo account

```bash
eas init
```

Accept all defaults. This adds a `projectId` to `app.json`.

### 5. Configure EAS Build

```bash
eas build:configure
```

Select **Android** (or All). This creates `eas.json`.

### 6. Build the Development Client APK

```bash
eas build --profile development --platform android
```

- When asked about Android Keystore — select **Generate a new keystore**
- Build runs on Expo's cloud (~5–10 minutes)
- When done, EAS gives you a download link and QR code for the APK

### 7. Install the APK on Your Phone

1. Open the download link on your Android device (or scan the QR code EAS shows)
2. Download the `.apk`
3. Open it — allow installs from unknown sources when prompted
4. Install the **ProPhone** dev client app

---

## Every Time You Work

### 1. Go into the app directory

```bash
cd /path/to/prophone-vite/app
```

### 2. Start the dev server

```bash
npx expo start --dev-client
```

### 3. Connect your phone

1. Open the **ProPhone** app on your phone (not Expo Go)
2. Scan the QR code shown in the terminal
3. The app loads and hot-reloads as you make changes

---

## When to Rebuild the APK

You only need to redo Steps 6–7 above when you:

- Add a new package that includes **native Android/iOS code** (e.g. `expo-camera`, `expo-notifications`)
- Change `app.json` fields like `name`, `icon`, or `permissions`

For all regular TypeScript/JavaScript changes, just `npx expo start --dev-client` is enough.

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Phone can't find dev server | Make sure phone and computer are on the same Wi-Fi network |
| "Unable to resolve host" | Run `npx expo start --dev-client --tunnel` to use a tunnel instead of LAN |
| APK won't install | Go to Settings → Security → allow installs from unknown sources |
| Build fails on EAS | Run `eas diagnostics` to check for config issues |
| Need to log in again | Run `eas login` and re-enter credentials |
