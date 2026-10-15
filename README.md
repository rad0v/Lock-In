# LockIn

Android-first React Native app built with Expo SDK 57, TypeScript, Expo Router and Reanimated. Phases 2–6 are implemented for local testing. **Stopped before Phase 7.** Clerk authentication and Supabase data connection follow this milestone. Native reminders/haptics still need device verification.

## Try the current build

The browser preview is served at **http://127.0.0.1:4173** while the preview process is running. Choose **Continue on this device** at sign-in. Each browser or Android installation has its own local commitments; local data is not synced between them.

The Expo server is also started for Android testing on the same local network. Open Expo Go and scan [the Android QR code](artifacts/phase-4/android-expo-go.png), or enter the URL in [android-url.txt](artifacts/phase-4/android-url.txt). This address is tied to the computer's current network and port 8081. If the server is stopped or the network changes, run:

```powershell
npm start -- --go --lan
```

No Android SDK or emulator was available in this workspace, so a native device session and an installable APK have not been verified. The Android JavaScript/Hermes bundle compiled successfully. A compiled bundle is not an APK; use Expo Go for this round of Android testing.

## Implemented

- Reference-based components, cream palettes, hard shadows, Inter fonts, safe-area layout, and Focus / History / Settings navigation.
- Reference auth screens and an explicit persisted local session. Clerk is the chosen sign-in provider; the earlier Supabase Auth prototype is disabled pending replacement.
- Six-step commitment setup with Build/Quit, preset/custom inclusive dates, daily counts, weekly quotas, custom weekdays, reward, review, confirmation, and draft recovery.
- Dashboard tracking, status filters, Build/Quit sections, full lists, commitment detail, calendar, and dated history.
- Binary/numeric check-ins, confirmed missed outcomes, exact catch-up expiry, paused dates/deadline extension, weekly quotas, optional reflection, linked restart and preserved history.
- Completion after the final active date and all requirements succeed; earned reward, calendar states, dated events and streaks.
- Press, selection, setup, screen, modal, list and state motion, live reduced-motion preferences, and independent haptic feedback.
- Optional Android local reminders with chosen time, private notification content, pause/terminal/sign-out cancellation, date routing, retry/status and a test reminder.

## Test boundary

Lifecycle runs against local storage and the device clock. Expiry and completion reconcile on read, write, foreground and a 30-second foreground refresh. Notifications never determine the commitment state. Future cloud integration will make server time authoritative. Phase 7 release quality work has not started.

See [testing instructions](docs/testing.md) for the test route and recorded verification.

## Development

Dependencies are installed and pinned by `package-lock.json`. On a fresh checkout, use Node 24 and `npm ci`.

```powershell
npm start
npm run typecheck
npm test
npm run export:web
npm run preview
npm run test:ui
npm run export:android -- --output-dir dist-android
```

Browser tests use an isolated Microsoft Edge profile and a 390 × 844 viewport, plus a compact 360 × 640 case. Export the web preview before running them. They do not read the user's normal browser profile.

## Connect Clerk and Supabase next

Follow [the integration handoff](docs/cloud-integration.md). Clerk owns sign-in; Supabase accepts its session tokens for private database access. No cloud projects are connected yet. **Do not apply the legacy Phase 2–4 SQL prototype for Clerk**: its ownership model requires replacement, along with transactional server lifecycle functions. Merely filling `.env.local` will not enable the disabled legacy client.

Local device data is separate from cloud accounts. There is no automatic migration of guest commitments into a cloud account in this build.

`eas.json` includes an internal APK profile (`preview`). Creating it later requires Expo account/project configuration. For a development client, install the SDK-compatible `expo-dev-client` package before using the `development` build profile.

## Project map

- `app/`: routes and tab shell.
- `src/components/`: reusable reference-based UI and check-in components.
- `src/screens/`: authentication, creation, and Focus screens.
- `src/domain/`: date, schedule, validation, and progress rules.
- `src/data/`: local storage and Supabase repositories.
- `src/state/`: session and data providers.
- `supabase/migrations/`: ownership policies and transactional create/log operations.
- `tests/`: schedule/storage tests and browser journeys.
- `artifacts/phase-4/`: screenshots, Android QR code, and dependency audit snapshot.
- `artifacts/phase-6/`: lifecycle and preference screenshots.

Design decisions are in [design.md](design.md); product rules are in [docs/behavior-spec.md](docs/behavior-spec.md); implementation status and pending checks are in [phases.md](phases.md).
