# Phase 6 — Local Testing Handoff

16 October 2026. Phases 5–6 are implemented locally. **Stop before Phase 7.** Clerk + Supabase connection is the next milestone.

## Try the app

Open [the browser preview](http://127.0.0.1:4173) while its server runs, or scan [the Expo Go QR](../artifacts/phase-4/android-expo-go.png) on the same network. Choose **Continue on this device**. Each browser/installation has separate local data. The QR address depends on the computer's current network; rerun `npm start -- --go --lan` if needed.

1. Create a commitment through all six steps and log a successful date. Numeric counts, weekly quotas, custom days and draft recovery still work.
2. Open a started commitment with future dates remaining. Pause, read the confirmation, and confirm. Its badge changes immediately; today's obligation stays available. Resume on the same date adds zero paused days. Resume after frozen dates extends the deadline.
3. Record Missed (Build) or Broke my Commitment (Quit). Cancel once to check that nothing changes; then confirm. The attempt becomes Broken and opens reflection. Select a reason or write a note, then Secure Log & Restart. Skip is optional. Inspect the new attempt's previous-attempt link and retained reflection/history.
4. For weekly pace, Not today / Didn't stay consistent records the date without breaking the attempt immediately. The quota is evaluated after the period's final catch-up deadline.
5. Reopen a commitment after an unfinished due date's 24-hour catch-up window. It becomes Broken with the original failed date recorded. A pause does not erase previous obligations.
6. Complete all requirements for a short commitment. Completion happens after its final planned date ends, or on a successful final catch-up save. Find it under History → Past attempts with Reward unlocked. It leaves the current Focus list.
7. In Settings, toggle haptics independently from Reduce motion; reload to verify persistence. System reduced motion also applies. Test modal dismiss/reopen and rapid option/filter changes.
8. On Android, enable Daily reminders and grant permission. Choose a 24-hour time and send a test reminder. Check foreground, background, lock-screen and cold-start tap routing. Deny/revoke permission and confirm the rest of the app remains usable.
9. Check reminder cancellation after logging, pause, failure, completion, time changes and leaving the local session. Resume recreates eligible reminders. A notification tap opens the relevant commitment/date; expired dates remain read-only.

## Verified automatically

| Check | Result |
| --- | --- |
| TypeScript | Pass |
| Domain/storage/lifecycle/reminder tests | 34 passed |
| Browser journeys | 10 passed in isolated Edge sessions |
| Web export | Pass |
| Android/Hermes bundle export | Pass |
| Screenshot inspection | Paused/broken detail, reflection, completed reward and preferences reviewed |

Logic tests cover exact grace boundaries, DST, custom/rest dates, partial quotas, frozen weekly periods, repeated pauses, terminal write rejection, completion timing, restart retries, atomic write failures, notification deduplication/cancellation and scheduling retry. Browser journeys cover the original five creation/tracking flows plus lifecycle, history, preferences and normal-motion modal exits. Snapshots created before Phase 5 remain readable.

## Reminder behavior and limits

- Local notifications are optional and native-only. Browser settings accurately explain availability. Expo SDK 57 documents local notifications as available in Expo Go; remote push is not used.
- The default time is 20:00 in each attempt's fixed time zone. A pending date may have one same-day and one catch-up nudge. Same-time nudges for one attempt are deduplicated, choosing the oldest due date.
- Planning looks ahead up to 30 days and retains the earliest 60 requests. It stops before the earliest unresolved failure deadline, avoiding stale reminders after an unobserved expiry. Opening/checking in refreshes this horizon. A nonexistent DST wall time is skipped.
- Pause, terminal status, disabled reminders and sign-out clear eligible pending requests. The scheduler preserves unchanged requests and safely retries partial native failures. Notifications never contain habit names or reflections.
- Android may deliver inexactly under battery/OS restrictions. No exact-alarm permission or remote push token is requested. Missed or delayed notifications do not change failure rules.
- Local lifecycle uses device time and reconciles when the app runs. Cloud server authority, scheduled server expiry, and Clerk identity isolation await the connection milestone.

## Pending native/cloud checks

No Android SDK/emulator is configured here. The successful Hermes export proves bundling, not APK installation, actual notification delivery, native animation smoothness or vibration. Those need a physical device. Also check Android back/keyboard/safe areas and final font/geometry against the references.

Clerk sign-in, email/Google flows, secure token restoration, native redirects, live Supabase transactions and cross-user access are not connected or tested. See [the cloud handoff](cloud-integration.md). Device-to-cloud migration and an offline cloud write queue are not implemented.

## Phase 7 boundary

No release quality phase, store setup, APK release, broad accessibility/security audit or dependency upgrade campaign was performed. The existing dependency audit reports 29 advisories (18 high, 11 moderate), including transitive Expo/Metro and URI decoding dependencies. [The Phase 4 snapshot](../artifacts/phase-4/dependency-audit.json) remains the baseline; no incompatible forced downgrade was applied. Resolve supported updates during the authorized release phase.

Official notification reference: [Expo SDK 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).
