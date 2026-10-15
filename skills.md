# LockIn — Skills and Working Practices

Last updated: 16 October 2026

This file records the capabilities and project practices needed to build LockIn, plus any Codex skills actually used. Update it as work progresses.

## Implementation capabilities

| Area | Needed capability | Planned use |
| --- | --- | --- |
| Android app | React Native, Expo, TypeScript, Expo Router | Screens, navigation, Android builds. |
| Visual implementation | Responsive React Native layout and reusable design tokens | Faithful reproduction of the supplied references. |
| Motion | React Native Reanimated and Expo Haptics | Microinteractions, entry/exit, layout and state transitions, touch feedback. |
| Backend | Clerk authentication, Supabase Postgres, row-level security | Private accounts, commitments, check-ins, history, and reflections. |
| Device features | Expo Notifications | Local reminders and, if later needed, remote push. |
| Verification | Android emulator/device testing, accessibility checks | Validate layouts, behavior, reduced motion, and installable builds. |

## Codex skills used

- **openai-docs** — used to check current official OpenAI guidance for the phase-by-phase model and reasoning effort recommendations. It does not add a runtime dependency to the app.

## Phase 1 methods and handoff

- Inspected the original PNGs with image-viewing tools, including their palette and typography boards.
- Used Pillow to read RGB frequencies from the supplied PNGs; original references were not modified.
- Produced reusable design tokens, screen specifications, a state transition diagram, and behavior acceptance cases.
- No new Codex skill was installed or invoked during Phase 1. Image inspection and writing project specifications used the available file/image tools.
- Future UI work should consume `design-tokens.json` and the canonical references in `design.md`; consult `docs/behavior-spec.md` before implementing scheduling or state changes.
- Validate current official library documentation when implementation begins; Phase 1 did not choose or install package versions.

## Skill use guidelines for this project

- Read applicable `SKILL.md` instructions before using a Codex skill.
- Use the design references and this project's recorded decisions as the source of truth for UI work.
- Keep a dated record in `phases.md` when a phase or a meaningful part of it is completed.
- Use `design.md` to record resolved visual variants and design tokens.
- Add newly used skills here with their purpose; do not list unused skills as completed work.

## Phases 2–4 implementation ledger

- Built with Expo SDK 57 / React Native 0.86.3 / React 19.2.3 / TypeScript 6, Expo Router, Reanimated 4, AsyncStorage, Supabase JS, SecureStore, and locally bundled Inter fonts. Exact installed versions are in `package-lock.json`.
- Used official Expo/Supabase documentation for current protected routing, compatible native dependencies, auth persistence, and deep-link behavior.
- Used Node's test runner with `tsx` for 14 date/storage acceptance cases and Playwright with isolated Edge sessions for five browser journeys. Tested the web-rendered React Native app rather than automating the user's existing browser sessions.
- Exported web and Android/Hermes bundles; Android native runtime and cloud access verification remain pending.
- No additional Codex skill or plugin was installed for app implementation. Supabase is prepared through its SDK and migration, with live connection deferred by the user.
- The earlier Phase 5 boundary was superseded when the user approved Phases 5–6. The active boundary is before Phase 7.

## Phases 5–6 implementation ledger

- Read the stored behavior contract and revisited original broken/paused/reflection PNGs with image tools; originals remain unchanged.
- Implemented pure lifecycle and reminder-planning functions with injected clocks/storage, serialized atomic local changes, and retry-safe notification scheduling.
- Verified 34 domain/storage/reminder cases and 10 isolated Edge journeys, including normal/reduced motion. Reviewed screenshots and compiled web and Android/Hermes bundles.
- Used official [Expo Notifications SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/) and installed native package source for compatible APIs, permission handling, local Expo Go support, and Android's inexact-alarm fallback.
- Checked official Clerk/Supabase integration documentation and recorded a separate handoff. Live services and Clerk SDK setup are deferred until the next milestone.
- No new Codex skills/plugins or subagents were used. Android device verification is still pending; Phase 7 release checks were not implemented.

