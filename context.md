# LockIn — Project Context

Last updated: 16 October 2026

## Product

LockIn is an Android app for making and tracking personal habit commitments. A person can **Build** a positive habit or **Quit** a negative one, define a target, choose a challenge duration and execution pace, set a motivating reward, then review and lock the commitment.

The daily experience centers on checking in, viewing progress and history, and managing commitments that are active, paused, or broken. When a commitment is broken, the app invites a private, nonjudgmental reflection and offers a restart path. History should be retained across pauses, breaks, and restarts.

## Agreed direction

- Platform: Android first. Keep a path open for iOS later.
- App stack: React Native with Expo and TypeScript; Expo Router for navigation.
- Authentication: **Clerk**, selected by the user after Phase 4. Backend: Supabase Postgres with Clerk-aware row-level security. Connect both after Phase 6.
- Motion: React Native Reanimated for microinteractions, screen content entry and exit, and state transitions; Expo Haptics for restrained touch feedback.
- Reminders: Expo Notifications, introduced after the core daily flow works.
- Design: Implement the supplied images faithfully. They are the visual specification, not loose inspiration. See [design.md](design.md).
- Development: Produce installable Android builds at major milestones. The first usable MVP is the end of Phase 4; the core product is complete after Phase 5.

## Core data concepts

- User account and profile.
- Commitment: Build or Quit, name, optional description, start/end dates, execution pace, reward, current status.
- Daily check-in or scheduled occurrence: completed, missed, or kept-consistent result as appropriate to the commitment.
- Dated lifecycle event: pause, resume, break, and restart.
- Private breach reflection: selected reason or custom note.

The behavior contract is defined in [docs/behavior-spec.md](docs/behavior-spec.md). Exact schema, migrations, and server implementation follow from Phase 2 onward. Progress and scheduling use the time zone captured for each attempt.

## Phase 1 decisions

Explicitly confirmed by the user on 15 October 2026:

- Bottom navigation: **Focus / History / Settings**.
- Unlogged scheduled work receives a **24-hour catch-up window** before breaking the attempt.
- Pausing freezes progress and extends the deadline by paused dates.

Implementation defaults selected during Phase 1:

- Dashboard reference 14; filtered empty state 25; first-account empty state 2.
- Image 27's modal shell for binary logs; image 26's counter for numeric logs.
- Presets use inclusive calendar duration. Example: 45 days from June 4 ends July 18.
- Pause stops reminders immediately; schedule freeze begins tomorrow, so today's obligation and logs remain. Resume uses the current date and extends the end by frozen dates.
- Weekly quotas count distinct successful dates in seven nonpaused dates anchored to the attempt start; prorate the final partial period upward.
- Restart creates a linked new attempt while preserving the failed attempt and its private reflection.
- The initial release supports cached reading but requires connectivity for saves. Full offline write syncing is deferred.
- The reference's Day/Week dropdown supports daily numeric targets such as hydration without adding a seventh setup step.
- Inter is a provisional font match. Sampled colors are exact PNG values; layout dimensions and font need comparison on Android.

See [design.md](design.md), [design-tokens.json](design-tokens.json), and [docs/screen-spec.md](docs/screen-spec.md) for implementation details. Choices described as defaults are not additional user-confirmed requirements.

## Current state

- The workspace currently contains 27 PNG design references in `design-context/`.
- Phase 1 is complete. Phases 2–5 are complete locally; Phase 6 implementation and automated checks are complete, with native device verification pending. See [phases.md](phases.md) and [docs/testing.md](docs/testing.md).
- The user selected GPT-6.1 Sol / High, approved continuing through Phases 5–6, and explicitly requested a **stop before Phase 7**. This supersedes previous phase boundaries.
- The user chose local testing first, with Supabase connected afterward. The app offers an explicit Continue on this device session and persists real local commitments/check-ins using AsyncStorage.
- Expo SDK 57 / React Native 0.86.3 / React 19.2.3, Expo Router, Inter fonts, Reanimated, auth screens, wizard, Focus, details, calendar, and History are implemented.
- Clerk will replace the earlier Supabase Auth preparation. The old client is disabled and the undeployed SQL is marked legacy. Clerk string subjects need new owner policies and server lifecycle RPCs; see [cloud integration handoff](docs/cloud-integration.md). Neither service is connected yet.
- TypeScript, 34 domain/storage/reminder tests, 10 browser journeys, web export, and Android Hermes bundle export pass. Native Android runtime, notification delivery, haptic feel, and an APK have not been verified; no Android SDK/emulator is configured here.
- Browser preview: http://127.0.0.1:4173 while its process runs. Expo Go server: port 8081; the current LAN QR code is in `artifacts/phase-4/android-expo-go.png`. See [README.md](README.md) for running either again.
- Phase 5 includes pause/resume, exact catch-up expiry, confirmed daily failures, weekly quota evaluation, private reflection, idempotent linked restarts, completion/reward unlock, calendars/events/history, and streaks. Local storage reconciles on read/write/foreground.
- Phase 6 includes reduced-motion and separate haptic preferences, press/selection/setup/modal/list/state transitions, and optional native reminders at a chosen time. Reminder content is private, schedules stop before unresolved expiry, and pause/completion/break/sign-out cancel upcoming reminders.
- Supabase connection with Clerk is the next milestone, before any Phase 7 release work. Device data is not automatically migrated to cloud accounts.
- Continue maintaining these notes as implementation changes or decisions are made.

## Remaining implementation checks

- Confirm the provisional font and inferred geometry against Android screenshots during Phase 2.
- History, Settings, auth support screens, and Completed state are derived from the existing design language because complete references were not supplied.
- Clerk/Supabase project access and configuration are deferred until after Phase 6. Do not place privileged backend keys in the mobile app.
- Review the recorded dependency advisories against supported SDK updates before release; details are in the testing handoff.

