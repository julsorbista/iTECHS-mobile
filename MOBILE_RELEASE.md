# iTECHS Mobile Release Handoff

## Native targets

This repository is a Capacitor hybrid-native application. Its bundled React/Vite interface and games run inside native platform containers.

- Android target: `Frontend/android`
- iOS target: `Frontend/ios/App/App.xcodeproj`
- Bundle identifier: `com.itechs.student`
- App name: `iTECHS Student`

The iOS target is native project source, not a PWA. Apple requires it to be compiled and signed with Xcode on macOS.

## Android development

The Android emulator reaches a backend on the Windows host through `10.0.2.2`:

```env
VITE_API_URL=http://10.0.2.2:5000/api
```

Build, sync, and open Android Studio:

```powershell
cd Frontend
npm run mobile:sync
npm run mobile:open
```

## Production HTTPS backend

The backend now includes a provider-neutral `Dockerfile`. Deploy `Backend` to a container host with a persistent MySQL database and set at minimum:

```env
NODE_ENV=production
PORT=5000
DATABASE_URL=mysql://USER:PASSWORD@HOST:3306/DATABASE
JWT_SECRET=replace-with-a-long-random-secret
CORS_ALLOWED_ORIGINS=http://localhost,https://localhost
SUPER_ADMIN_EMAIL=admin@example.com
SUPER_ADMIN_PASSWORD=replace-before-first-deploy
```

Set the remaining email and AI variables only when those features are required. The host must expose `/health` over HTTPS. Do not commit `.env` or production secrets.

Before producing physical-device builds, copy `Frontend/.env.production.example` to the build environment and replace the example URL:

```env
VITE_API_URL=https://YOUR-BACKEND-HOST/api
```

Then run `npm run build` followed by `npx cap sync android` and/or `npx cap sync ios`. Both mobile platforms can use the same HTTPS API.

## iOS final compilation

On an institution-provided Mac:

```bash
cd Frontend
npm install
npm run ios:sync
npm run ios:open
```

In Xcode, select the `App` target, choose the institution's Apple development team under **Signing & Capabilities**, connect an iPhone, select it as the destination, and press **Run**. Confirm Developer Mode on the iPhone if prompted.

Final iOS validation should cover login, all six game catalogs and Level 1 launches, audio, orientation, touch input, background/resume behavior, and API access over HTTPS.

## Institutional access request

Suggested request to the adviser or school IT department:

> iTECHS includes generated native Android and iOS Capacitor targets. Android is compiled and tested on Windows. Apple requires Xcode on macOS for the final iOS compilation and signing step. Please provide temporary access to an institution-managed Mac and Apple development team so we can compile `Frontend/ios/App/App.xcodeproj`, install it on the test iPhone, and complete final validation.
