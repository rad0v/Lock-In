# LockIn — Build Phases and Progress

Last updated: 16 October 2026

Status key: **Not started**, **In progress**, **Complete**, **Complete (local)**, **Implemented; device verification pending**. Phases 2–6 are implemented for local testing. **Stop before Phase 7.** Clerk/Supabase connection follows Phase 6. Native device/APK gates remain pending and are not claimed as complete.

| Phase | Status | Deliverable / completion gate | Suggested Codex setting |
| --- | --- | --- | --- |
| 1. Design and behavior spec | Complete | Canonical references and derived screens mapped; navigation confirmed; tokens, components, motion, and commitment rules specified. | GPT-6 Astra, High |
| 2. App foundation | Complete (local) | Expo/TypeScript, reusable UI, guarded navigation, auth integration code, local session, Supabase client/migration. Live auth and native installation pending external setup. | GPT-6.1 Sol, High (user-selected) |
| 3. Commitment creation | Complete (local) | All six steps, date/pace editors, validation, review, confirmation, and resumable draft. Persists locally; cloud repository/RPC prepared. | GPT-6.1 Sol, High |
| 4. Dashboard and daily tracking | Complete (local) | Dashboard, filters/lists, positive binary and numeric logs, catch-up access, details/calendar, History, reload persistence. Browser journeys and Android bundle verified; device testing pending. | GPT-6.1 Sol, High |
| 5. Commitment lifecycle | Complete (local) | Pause/resume with frozen dates, automatic/explicit failure, reflection, idempotent restart, completion/reward unlock, retained history and streaks. | GPT-6.1 Sol, High (user continued) |
| 6. Motion and reminders | Implemented; device verification pending | Selection/press, setup/screen/modal/list/state motion, reduced motion, haptic preferences, opt-in native reminders and date routing. Logic/browser/bundle verification passed; Android delivery and feel still need a device. | GPT-6.1 Sol, High (user continued) |
| 7. Release quality | Not started | Accessibility, reduced motion, loading and error states, security checks, device testing, and closed-test Android build. | GPT-6.1 Sol, High |

The user authorized Phases 2–4 at **GPT-6.1 Sol / High**, then approved continuing through **Phases 5 and 6** after testing. The active stop is **before Phase 7**. The user selected **Clerk authentication**, with Supabase connection after Phase 6. No model handoff is needed within this authorized scope.

## Phases 5–6 implementation and verification

- Lifecycle: transactional local reconciliation on reads, foreground, 30-second foreground refresh, and writes; exact 24-hour catch-up; daily and weekly failure rules; paused schedule extension; terminal write protection; end-of-timeline completion and reward unlock.
- History: timestamped events, dated failed outcomes, frozen dates, streak units, private optional reflection, one replacement per failed attempt, previous/new attempt links, completed/broken archive. Old Phase 4 local snapshots remain compatible.
- UI: supplied active/paused/broken detail and reflection language; confirmation for failed daily outcomes; weekly unsuccessful dates stay active until the period deadline. Focus excludes completed and superseded attempts.
- Motion: live system/app reduced-motion preference; selection colors, pressed controls, directional wizard entry/exit, modal open/close, list entry/exit/layout, badge/count/check/reward state changes, saved-lock settle and native stack/tab transitions.
- Feedback: persisted independent haptic toggle; success only after saved writes; restrained failure/pause/resume feedback.
- Reminders: native opt-in permission, quiet Android channel, chosen wall-clock time per attempt zone, private content, cancellation/rescheduling, retry after native scheduling failure, tap routing to the logical date, test reminder, sign-out cleanup. Browser shows availability accurately.
- Verification: 34 domain/storage/reminder tests; 10 browser journeys covering original flows plus lifecycle/preferences/motion; TypeScript and web/Android Hermes exports pass. Screenshot evidence is in `artifacts/phase-6/`.
- Native notification delivery, actual vibration, Android animation feel, keyboard/back and installation remain device checks. The environment has no configured Android SDK/emulator; no native runtime result is claimed.
- Clerk/Supabase handoff: [connection plan](docs/cloud-integration.md). Old Supabase Auth code is disabled and its undeployed SQL prototype is clearly marked as incompatible with Clerk subjects. Live connection has not started.

## Phases 2–4 implementation and verification

- Foundation: Expo SDK 57, React Native 0.86.3, React 19.2.3, TypeScript, protected Expo Router navigation, reusable reference-based UI, four Inter weights, local session, and cloud auth integration.
- Creation: Build/Quit, names/descriptions, inclusive presets/custom range, daily/weekly/custom-day pace, numeric daily targets, reward, review/lock, idempotent creation, and per-session draft recovery.
- Daily use: Focus dashboard, today/catch-up tracking, independent status filters, Build/Quit lists, positive daily logs, numeric counts, weekly quota progress, dated History, detail/calendar/reward preview, and persistence across reloads.
- Backend preparation: owner-scoped commitments/attempts/check-ins, RLS, and transactional create/log RPC migration. No cloud project or migration execution yet, per the user's choice.
- Verification: TypeScript pass; 14 domain/storage tests pass; 5 browser journeys pass at 390 and 360 widths; Expo package compatibility pass; web and Android/Hermes bundle exports pass.
- Visual review: auth, setup path selection, custom duration, detail and dashboard screenshots; adjusted path choices and timeline linework, and placed the custom calendar inline in step 3 as in reference 7. Original font identity and final Android calibration remain pending.
- Evidence: [manual testing guide](docs/testing.md), [README](README.md), and screenshots/QR/audit in `artifacts/phase-4/`.

### Pending checks (updated after Phase 6)

- No Android SDK/emulator is configured here; the Android bundle compiled, but an APK and actual Android runtime have not been verified. Expo Go server/QR are prepared for the user's device test.
- Clerk + Supabase connection, native auth deep links, provider configuration, replacement migration execution, and live cross-user access checks remain pending.
- Phase 5 is now implemented locally; server authority and scheduled cloud reconciliation belong to the upcoming connection milestone.
- Phase 6 native haptics/reminders are implemented but require Android device verification. Phase 7 release checks and dependency advisory resolution have not started.

## Phase 1 completed deliverables

- [Design specification](design.md): reference selection, 18 sampled semantic colors, typography, layout, component states, and motion timing.
- [Design tokens](design-tokens.json): reusable machine-readable values and provenance/confidence notes.
- [Screen specification](docs/screen-spec.md): authentication, tabs, wizard, dashboard, logging, details, history, settings, and reference coverage.
- [Behavior specification](docs/behavior-spec.md): duration, catch-up, pause/resume, quotas, failure, restart, completion, data boundaries, and acceptance examples.
- [Project context](context.md) and [skills ledger](skills.md) updated for the next phase.

### Decisions confirmed by the user

- Focus / History / Settings bottom navigation.
- 24-hour catch-up window before automatic failure for unlogged scheduled work.
- Freeze progress and extend the deadline by paused dates.

### Defaults chosen during specification

- Preserve separate setup and dashboard cream palettes; use 14 for dashboard, 25 for filtered empty state, 27 for binary log shell, and 26 for numeric logging.
- Preserve today's obligations when pausing; schedule freeze starts the next local date. Stop reminders immediately.
- Use inclusive duration, attempt-local time zones, distinct-date weekly quotas, and new linked attempts on restart.
- Use cached reading with online saves for the first release; full offline syncing remains deferred.
- Use Inter provisionally. Original font identity and exact raster-to-layout measurements remain device-validation checks, not verified source facts.

### Verification

- Parsed `design-tokens.json` successfully and verified all 18 sampled semantic colors against their stated original PNGs.
- Checked local Markdown links: none broken. All 27 original PNGs remain present.
- Reviewed navigation, states, and timing examples for agreement across the specifications.
- No app tests or Android build yet: Phase 1 produced specifications; app implementation begins in Phase 2.

### Earlier Phase 2 handoff from Phase 1 (completed locally)

Read `context.md`, `design.md`, `design-tokens.json`, and both files under `docs/` first. Establish the app and shared visual primitives, then navigation/auth and Supabase foundation. Verify the provisional font and geometry against the references during this work. Backend account access/provider configuration may be needed to finish live authentication; keep service keys out of the app.

## Progress log

### 15 October 2026

- Reviewed all 27 images in `design-context/` and summarized the product and visual language.
- Agreed on the proposed React Native/Expo, Supabase, and Reanimated direction.
- Established the seven-phase plan, completion gates, and model/effort recommendations.
- Created project context documents. No app implementation has begun.
- Completed Phase 1 with the user's three behavior/navigation choices and the documented implementation defaults.
- Verified specification artifacts and stopped before Phase 2 at the user's requested model-change boundary.
- User changed to GPT-6.1 Sol / High and authorized coding through Phase 4, with a stop before Phase 5.
- User chose local testing first and Supabase connection afterward; supplied an explicit persisted local session rather than simulated cloud authentication.
- Implemented Phases 2–4 and verified the recorded local test gates. Prepared a live browser preview and Expo Go testing address/QR.
- Stopped before Phase 5 for the user's progress test. Native Android runtime/APK and live Supabase checks are pending.
- User liked the result and authorized Phases 5–6, with a stop before Phase 7; selected Clerk for sign-in and Supabase connection after Phase 6.
- Implemented and verified local lifecycle, motion/preferences, and notification planning/adapters. Updated all four context files and the testing/cloud handoffs. Stopped at the Phase 7 boundary.

Add dated entries here as each phase advances. Record meaningful scope or design changes and the Android build or test used to verify completion.

