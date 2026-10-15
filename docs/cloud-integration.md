# Clerk + Supabase connection handoff

15 October 2026. The user selected **Clerk for sign-in** and **Supabase for app data**, with connection after Phase 6. This integration is the next separate milestone; Phase 7 remains unstarted.

## Current boundary

The app runs in explicit device mode. No Clerk project, keys, Supabase project, remote migration, or provider configuration has been connected. The previous Supabase Auth code is disabled in `src/lib/supabase.ts`, even if old environment values are present. Existing device data stays intact. There is no automatic device-to-cloud migration.

The existing SQL migration is an **undeployed legacy prototype**, not a deployment-ready Clerk schema. Its UUID `auth.users` foreign keys and `auth.uid()` policies do not match Clerk's string user subjects. Do not apply it as the current schema or merely turn on the old client.

## Connection work

1. Configure a Clerk application and its Native API with email and Google sign-in as desired. Use the current `@clerk/expo` SDK, secure token cache, and custom flows that preserve the reference auth UI. Implement verification, reset, cancellation, sign-out, and session restoration with Clerk.
2. Enable the native Clerk third-party auth integration in Supabase. Supply Clerk session tokens through Supabase JS's `accessToken` callback. Use the supported native integration rather than the deprecated JWT template path.
3. Replace the undeployed SQL prototype with text owner subjects checked against `auth.jwt()->>'sub'`. Require authenticated roles and owner checks for every table/RPC. Never ship a service-role key.
4. Port the tested lifecycle rules to transactional server functions: lock, check-in, explicit failure, pause, resume, expiry, reflection/restart, and completion. Persist pause intervals, lifecycle events, private reflections, attempt links, and per-date outcomes. Use server time, preserve idempotency, and reconcile before writes/reads plus a scheduled expiry job.
5. Adapt the cloud repository and account cache to Clerk identity. Keep local device data separate, unless the user explicitly chooses a migration flow. Cancel reminders and clear private account caches/drafts on sign-out or account change.
6. Verify native redirects in an installed app, two-user data isolation, expired sessions, denied writes, rollback/retry behavior, and parity with local lifecycle tests.

## Official references checked

- [Clerk's Supabase integration](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase's Clerk third-party authentication](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart)

The integration scopes database access; it does not automatically synchronize Clerk user records into Supabase. Add profile synchronization only if the app needs persisted profile records.
