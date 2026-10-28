# Android Verification Report

Date: 2026-08-01

Device profile: Pixel 7 API 35 Android Virtual Device

## Passed

- Capacitor Android debug APK builds and installs successfully.
- Android WebView origin is `http://localhost`; local HTTP API calls no longer produce mixed-content warnings.
- Emulator reaches the Windows backend at `http://10.0.2.2:5000`.
- Student authentication succeeds in the installed WebView.
- All six game catalogs render from the live backend:
  - Game 1: 5 levels
  - Game 2: 5 levels
  - Game 3: 10 levels
  - Game 4: 5 levels
  - Game 5: 5 levels
  - Game 6: 5 levels
- Every catalog exposes an enabled **Start Level** action for the test student.
- Production frontend build succeeds without missing Game One statue or Game Four sound warnings.
- Game One now provides mobile movement, jump, and attack controls.
- Game Four now provides mobile left/right catcher controls.
- Games Two and Three use pointer/drag interactions; Game Five provides on-screen letter controls; Game Six focuses a native soft-keyboard input.

Games Two and Three took approximately 12 seconds to render their level catalogs on the low-memory AVD. They completed successfully rather than remaining stuck.

## Test-suite findings

Frontend: 76/79 assertions pass. Existing failures are in:

- `questionRetryVariants.test.js`: expected distractor rotation differs from current generated distractors.
- `progressBridge.test.js`: two scoring/submission expectations differ from current gameplay thresholds.

Backend: 10/12 assertions pass. Existing failures are in:

- Admin draft/publish smoke test expects HTTP 200 but receives 400.
- Student progression smoke test expects `COMPLETED` but receives `FAILED` under current scoring rules.

These failures predate and are independent of the asset, WebView-scheme, and mobile-control changes in this verification pass.

## Remaining physical-device validation

Run one complete Level 1 session in each game on a physical Android phone. Confirm audio, orientation changes, background/resume, soft-keyboard behavior, and touch targets. The emulator renderer sweep was interrupted when the AVD exited under host memory pressure; the AVD itself warns that 16 GB available memory is recommended.
