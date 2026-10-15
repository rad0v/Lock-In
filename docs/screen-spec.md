# LockIn — Screens and Navigation

Last updated: 15 October 2026. Implementation specification for Phases 2–7.

## Navigation

Signed out: Sign in → Create account / Reset password. Successful authentication opens Focus.

Signed in: bottom tabs **Focus / History / Settings**, as confirmed by the user. Profile icon opens the account section of Settings. Commitment creation, details, and reflection open above the tab shell; hide bottom tabs on these focused routes. Back returns to the source tab without losing its filter or scroll position.

The six-step wizard is one resumable draft flow. Android back closes an open picker/modal first, then moves to the previous step. Leaving step 1 retains the local draft. Reopening creation offers Continue draft or Start new; discard only through an explicit choice.

## Canonical screen inventory

| ID / planned route | Reference | Layout and actions | Implementation phase |
| --- | --- | --- | --- |
| AUTH-01 `/sign-in` | 1 | Brand and English selector; central heading/body; rounded form panel; email/password; dark Enter Focus Mode action; sign-up link; divider; Google action | 2 |
| AUTH-02 `/sign-up` | Derived from 1 | Same shell, email/password and confirmation; submit, verification guidance, return to sign-in | 2 |
| AUTH-03 `/reset-password` | Derived from 1 | Email request and secure reset completion; same form tokens | 2 |
| FOCUS-00 `/focus` empty | 2 | Centered raised plus and no-commitments message; profile; bottom tabs | 2 shell, 4 data |
| FOCUS-01 `/focus` populated | 14 | Greeting/date card, new commitment action, today's tracking, filter chips, Building Habits, Quitting Habits | 4 |
| FOCUS-02 `/focus` filtered empty | 25 | Keep greeting and today's tracking; selected status chip; no-matching-commitments message | 4 |
| CREATE-01 `/commitment/new` step 1 | 3–4 | Build/Quit choice cards; first step of six; Set Commitment | 3 |
| CREATE-02 step 2 | 5 | Target and optional description; Back; Set Timeline | 3 |
| CREATE-03 step 3 | 6–7 | 7/30/45/90-day presets; custom start/end dates with calendar; Set Execution Pace | 3 |
| CREATE-04 step 4 | 8–10 | Everyday, Flexible Pace, Custom Days; option editor modal; Set Reward | 3 |
| CREATE-05 step 5 | 11 | Four reward presets and custom field; Lock In Commitment | 3 |
| CREATE-06 step 6 | 12–13 | Review name, timeline, pace, reward; Confirm & Lock; final confirmation modal | 3 |
| LOG-01 modal | 27, 18, 26 right | Header/close, habit name, date/day context, success or missed/broken choice; honest outcome copy | 4/5 |
| LOG-02 numeric modal | 26 left | Minus, current count, plus, Apply Changes; visible target and date as small supporting labels | 4 |
| DETAIL-01 `/commitment/:id` active | 19 | Back, title/description/status; timeline; recent-history calendar; reward; Pause Commitment | 4/5 |
| DETAIL-02 paused | 20 | Same layout; paused timeline and Resume Commitment | 5 |
| DETAIL-03 broken | 16 | Same layout; failed-date marker and Restart Commitment | 5 |
| REFLECT-01 `/commitment/:id/reflection` | 21 | Why did it Unlock?; habit/broken chip; reason choices or custom note; Secure Log & Restart | 5 |
| HISTORY-01 `/history` | Derived from 14/19 | Date navigator and daily logs, followed by completed/previous attempts newest first; tap to inspect the relevant attempt's timeline, calendar, reward, and reflection | 4 read shell, 5 lifecycle |
| SETTINGS-01 `/settings` | Derived from 1/14 | Account summary, reminders/time, haptics, motion follows system, sign-out; existing card/field/action components | 2 account shell, 6 preferences |
| DETAIL-04 completed | Derived from 19 | Completed chip, full timeline, unlocked reward, preserved calendar; New Commitment action | 5 |
| LIST-01 `/tracking` | Derived from 14 | Full today/catch-up list reached by View all | 4 |
| LIST-02 `/commitments` with path filter | Derived from 14 | Full Build or Quit cards; carry current status filter | 4 |

Derived screens use the established design components; they have no complete supplied mockups. Attempt details in History resolve an explicit attempt ID, rather than always loading the current attempt of the commitment.

## Dashboard details

- Default status filter is Active; All combines active, paused, and broken current attempts. Completed and superseded attempts live in History.
- Today's tracking is independent of the card status filter, matching 25. It shows due tasks and completed tasks for today, sorted with unfinished first. An additional Catch up label groups eligible overdue tasks using the same row component.
- Header greeting uses profile display name when present, otherwise a neutral greeting; never populate a mock person's name.
- The compact date strip shows the current week. Selecting a past day navigates to its history context; it does not silently change what Today means.
- Building and Quitting cards are grouped separately. Their View all controls open filtered lists. Card body opens detail; Resume/Restart acts on that specific commitment.
- A future-start commitment appears under Active with Starts [date] and Day 0 / N; it creates no early tracking rows.
- If nothing is due today, show You're all caught up or No commitments due today as appropriate. Do not show the first-account empty state when commitments exist.

## Wizard fields and validation

| Step | Baseline rules |
| --- | --- |
| Path | Explicit Build or Quit selection required. |
| Target | Trimmed name: 1–80 characters. Optional description: at most 300. Empty/invalid fields show inline errors. |
| Timeline | Presets start today. Custom start is today or later; end is on/after start. Inclusive duration is 1–365 days. |
| Pace | Everyday = once per day. Flexible editor retains image 9's unit dropdown and supports Day or Week; Build day count 1–99, week quota 1–7 distinct days. Quit day count is 1; weekly quotas and custom days are available. Custom Days requires at least one weekday and at least one occurrence within the chosen duration. |
| Reward | One preset or a nonempty custom reward, maximum 120 characters; typing custom clears preset selection. |
| Review | Display real inclusive dates, chosen pace, and reward. User can go back to edit. Rules become fixed only after final save succeeds. |

The Day option in the Flexible Pace unit selector is an inferred extension needed to create the hydration count shown in 14/26. Keep the supplied dropdown/modal layout; do not add a seventh wizard step.

Back/next preserves entered values. Closing an option editor without Apply Target discards only its temporary changes. Lock confirmation shows Go Back and Yes, Lock It; duplicate taps cannot create duplicate commitments. A save failure leaves the review and draft intact with a retry action.

## Logging and reflection copy

- Build daily binary: **Done! / Missed** in the image 27 modal shell.
- Quit daily/custom: **Stayed Consistent / Broke my Commitment** as in 27.
- Weekly quota: **Done! / Not today** for Build; **Stayed Consistent / Didn't stay consistent** for Quit. Supporting text explains that the weekly target determines the commitment's result; one unsuccessful date does not necessarily break it.
- Numeric: save an absolute count between zero and the target; the row fills and checks only when the target is reached.
- When saving an explicitly unsuccessful daily result, explain that it will break this attempt and reveal a compact confirmation using the image 13 pattern. Cancel returns to the log unchanged.
- Reflection choices: Low Energy, Time Crunch, Lack of focus, Social Plans. Select one reason or enter a custom note; an optional Skip reflection action allows restart without forced disclosure.
- Leaving reflection keeps the broken attempt and any saved note intact. The destructive outcome is not undone by closing this screen.

## Shared interaction behavior

- Screen content respects keyboard and safe areas. Error text sits near the related field/action and is accessible to screen readers.
- Close, outside tap, and Android back dismiss idle modals. Prevent duplicate submits while saving; successful navigation occurs once.
- Preserve data through refresh and retry; show cached content with a visible offline indicator when disconnected. Offline logging policy is defined in the behavior specification.
- English is the release baseline. Preserve the language selector styling; its sheet lists English as selected without advertising unimplemented translations.
- Loading placeholders follow existing card geometry. Errors use short messages and Retry, with no raw backend errors or technical terms in the product UI.

## Reminder baseline for Phase 6

Reminders are opt-in, with a user-chosen local time and the attempt's fixed time zone. Schedule for eligible active dates while the target is unfinished. Cancel the remaining reminder for a successful date; cancel future reminders while paused, broken, or completed. Rebuild affected reminders after resume or a time preference change. Opening a reminder opens the relevant commitment/date; expired dates show history rather than a writable check-in.

Permission denial leaves the app usable and shows a clear disabled reminder preference. Do not promise delivery at an exact minute or depend on notification delivery to determine failure. Android scheduling details and device behavior are implementation checks in Phase 6.
