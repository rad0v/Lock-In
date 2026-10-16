# Clerk + Supabase connection handoff

15 October 2026. The user selected **Clerk for sign-in** and **Supabase for app data**, with connection after Phase 6. This integration is the next separate milestone; Phase 7 remains unstarted.

## Current boundary

The three public environment values are present. Clerk is integrated into the custom auth UI and supplies its active session token to Supabase. Existing device data stays intact and there is no automatic device-to-cloud migration.

The old `202610150001_phase_2_to_4.sql` file remains an **undeployed legacy prototype** and must not be applied. The replacement is `supabase/migrations/202610160001_clerk_cloud.sql`; it uses Clerk text subjects and `auth.jwt()->>'sub'` ownership checks.

The user reported `Success. No rows returned.` after running the replacement migration in Supabase on 16 October 2026. This confirms query execution but not yet authenticated app access or user isolation.

Phone testing then showed that Clerk Google OAuth created a user but returned to a missing `/sso-callback` route. The app now contains that route and supplies the redirect explicitly. Cloud commitment creation still returned a generic error for both email and Google accounts. The development build now displays and logs the Supabase error code/message so the failing auth or RPC condition can be identified on the next test; no credentials are logged.

The first cloud save failure was traced to `EXPO_PUBLIC_SUPABASE_URL` containing `/rest/v1/`. Supabase JS adds this path itself, so requests went to a doubled path and returned 404. The app now normalizes the configured URL to the HTTPS project origin. A direct check against the corrected endpoint reached the deployed RPC and returned the expected `42501` denial for an anonymous request.

The user then confirmed that phone login and commitment creation work after these fixes. A later `Load commitments` request returned `42501` (`permission denied for function lockin_snapshot`). The migration grants this function to `authenticated` only, and the same denial occurred in an earlier anonymous probe. The role and token of the failing phone request are not yet known. If the error happens only as the session starts, investigate token readiness; if it persists, verify Clerk's Supabase integration, Supabase's Clerk third-party provider, and the token's `role: authenticated` claim. Do not grant the function to `anon` to hide the problem.

Remaining acceptance checks are reliable cloud loading after sign-in/session restoration, sign-out/sign-in persistence, a second account seeing none of the first account's data, check-ins, pause/resume, failure/restart, and expiry/completion behavior in cloud mode. The user will provide direction on the remaining work before Phase 7.

## Dashboard configuration to verify if cloud loading keeps failing

1. In Clerk, enable the Native API, email/password sign-in, email verification, and Google social connection.
2. In Clerk, activate the Supabase integration and copy the Clerk domain it displays.
3. In Supabase, open Authentication > Sign In / Providers > Third-Party Auth, add Clerk, and paste that domain.
4. Restart Expo so `.env.local` is bundled, then create one test account and one commitment.
5. Sign out and back in, then confirm the commitment reappears. Repeat with a second account to confirm account isolation.

## Connection work

1. Configure the Clerk and Supabase dashboard settings listed above.
2. Verify the applied Clerk-compatible migration with a live account and data test. Never ship a service-role key.
3. Port the tested lifecycle rules to transactional server functions: lock, check-in, explicit failure, pause, resume, expiry, reflection/restart, and completion. Persist pause intervals, lifecycle events, private reflections, attempt links, and per-date outcomes. Use server time, preserve idempotency, and reconcile before writes/reads plus a scheduled expiry job.
4. Adapt the cloud repository and account cache to Clerk identity. Keep local device data separate, unless the user explicitly chooses a migration flow. Cancel reminders and clear private account caches/drafts on sign-out or account change.
5. Verify native redirects in an installed app, two-user data isolation, expired sessions, denied writes, rollback/retry behavior, and parity with local lifecycle tests.

## Official references checked

- [Clerk's Supabase integration](https://clerk.com/docs/guides/development/integrations/databases/supabase)
- [Supabase's Clerk third-party authentication](https://supabase.com/docs/guides/auth/third-party/clerk)
- [Clerk Expo quickstart](https://clerk.com/docs/expo/getting-started/quickstart)

The integration scopes database access; it does not automatically synchronize Clerk user records into Supabase. Add profile synchronization only if the app needs persisted profile records.
