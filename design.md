# LockIn — Design Specification

Last updated: 16 October 2026. Phase 1 design contract with Phase 6 implementation notes.

## Authority and decisions

The 27 original PNGs in `design-context/` are the visual specification. Match their layout, visual hierarchy, color, borders, shadows, and component states. They have different export scales; image pixels are not automatically Android layout units.

The user confirmed **Focus / History / Settings** as bottom navigation on 15 October 2026. Image 24 is an alternate concept, not the navigation to implement. Use image 14 for the populated dashboard, 25 for filtered empty results, and 2 for a completely empty account.

For daily logging, use the larger, readable modal in image 27 for binary outcomes, the counter in image 26 for numeric outcomes, and the established modal treatment throughout. This is an implementation choice combining the supplied variants. Image 18 supplies Quit outcome semantics; image 26 supplies Build outcome semantics.

Do not reproduce editor artifacts: blue selection frames in 15/19/26, gray design-board backgrounds, crop borders, numbered labels, or inconsistent example calendar highlights. Use real data in place of the mock person's name, dates, and examples.

Supporting specifications:

- [Screen specification](docs/screen-spec.md): routes, layouts, actions, and screen states.
- [Behavior specification](docs/behavior-spec.md): scheduling, check-ins, lifecycle, and acceptance examples.
- [Design tokens](design-tokens.json): machine-readable color, dimension, type, and motion values.

## Color system

The following exact RGB colors were sampled from the supplied PNGs. The distinction between setup/auth and dashboard/detail backgrounds is intentional.

| Token | Hex | Use / evidence |
| --- | --- | --- |
| canvas.setup | #F4EFE6 | Auth, setup, reflection; 1, 5, 21 |
| canvas.focus | #F4F1EA | Dashboard, detail, daily log; 14, 19, 27 |
| surface.panel | #FAF7F2 | Large setup and calendar panels; 1, 5, 19 |
| surface.tracking | #FAF6F0 | Tracking rows; 14 |
| surface.card | #E6E1DA | Commitment, timeline, reward cards; 14, 19 |
| surface.hero | #C9C4BB | Dashboard greeting/date card; 14 |
| surface.input | #FFFFFF | Fields and choice cards; 1, 5 |
| surface.logAction | #FEF8F7 | Daily log action surface; 27 |
| ink.primary | #251F1A | Setup text and main CTA fill; 1, 5, 21 |
| ink.focus | #0D0805 | Dashboard and detail text; 14, 19 |
| ink.secondary | #4D4540 | Supporting text; 1, 24 |
| ink.muted | #807C77 | Nonessential supporting text; 14 |
| accent.mint | #6CF8BB | Selected bottom tab; 2, 24 |
| success.foreground | #00714D | Progress, checkmarks, active labels; 14 |
| success.background | #A9EDCA | Active status chip; 14 |
| danger.foreground | #BA1A1A | Broken and destructive outcome labels; 17, 27 |
| danger.background | #E9BFBB | Broken status surface; 21 |
| calendar.success | #BBD4C7 | Completed calendar cells; 19 |

Image 22's neutral palette is retained in `design-tokens.json` as a reference scale. Semantic tokens above take precedence where rendered screens differ. Low-contrast sample placeholders and secondary text may need a darker token to remain readable; preserve the palette and hierarchy while doing so.

## Typography and measurement confidence

Image 23 explicitly shows heading sizes **38, 30, 24, 19, 15** and body sizes **23, 19, 15, 12, 10, 8**, built around a 1.25 scale. Retain that scale in the tokens.

The font family is not named in the supplied images. **Inter** is the provisional implementation family, with regular 400, medium 500, semibold 600, and bold 700. This is a matching choice, not a verified extraction. Validate the shapes and line wrapping against the references once font rendering is available; change the family if a closer match or original font is supplied.

| Role | Size / line height | Weight | Use |
| --- | --- | --- | --- |
| Detail title | 38 / 40 | 700 | Habit detail title; allow natural wrapping |
| Screen title | 30 / 38 | 700 | Setup and reflection headings |
| Brand / modal title | 24 / 30 | 700 | LockIn wordmark and modal headings |
| Card title | 19 / 24 | 700 | Commitment and tracking titles |
| Body / fields | 15 / 24 | 400 | Descriptions and form inputs |
| Button / section label | 12 / 16 | 600 | Uppercase actions and spaced section labels |
| Metadata | 12 / 16 | 400 | Dates, counts, status, reward previews |

Sizes 8 and 10 are retained as reference evidence, not the default for meaningful mobile text. Permit system font scaling; labels wrap instead of being clipped. Line heights, spacing, and radii are implementation measurements inferred from the varying raster exports, and require device comparison.

## Layout baseline

- Reference implementation viewport: 390 logical units wide. Check 360, 390, and 412 widths, compact height, and increased font size. Content remains one column.
- Outer gutter: 16. Panel padding: 24. Compact card padding: 16. Spacing scale: 4, 8, 12, 16, 24, 32, 40, 48, 64.
- Header height: 56 plus top safe area. Bottom tabs: 64 plus bottom safe area. Fixed CTAs sit above the Android system area, with 16 outer inset.
- Setup panel: radius 36, thin 1-unit border, offset backing layer at x=2/y=4. The main panel starts approximately 112 units below the safe-area top at the baseline size.
- Dashboard and detail cards: radius 28. Modal: radius 32, outer margin 16, maximum width 420; content scrolls when necessary.
- Choice cards and form fields: radius 0–2, border 1, hard backing offset x=3/y=4. Primary button: minimum height 56. Touch areas: minimum 48 by 48, including small icon controls.
- Compact tracking row: minimum height 76; expands for longer content. Progress line: 3 high. State chips: fully rounded, with visible text as well as color.
- Use a colored backing view for the crisp offset shadows. Android elevation alone does not define the reference's hard shadow shape. Auth input pills retain their separate, softer shadow treatment.
- Avoid fixed whole-screen heights. Main content scrolls; bottom actions remain reachable when the keyboard is open. Header, body, and footer must not overlap at compact heights.
- Wider devices use a centered content column capped at 480; match the phone references first.

## Reusable components and states

| Component | Required states and behavior |
| --- | --- |
| AppHeader | Brand + profile; or back + brand; clear accessible names for icon controls |
| BottomTabs | Focus, History, Settings; selected mint pill as in 2; retain each tab's scroll position |
| PrimaryButton | Resting, pressed, disabled, saving; label area stable when spinner appears |
| RaisedChoice | Unselected light face, selected dark face, pressed, disabled; selected state has semantics beyond color |
| TextField | Empty, populated, focused, invalid, disabled; helper/error text beneath field without hiding entered data |
| SetupPanel / StepProgress | Six steps; current progress and step label remain synchronized |
| StatusChip | Active, Paused, Broken, Completed; text + indicator; future start uses supporting date text |
| TrackingRow | Unlogged, partial numeric, complete, saving, save failed, catch-up available |
| CommitmentCard | Active, paused, broken; name, description, timeline, reward preview, contextual action |
| Timeline | Current ordinal day, duration, remaining dates or paused/broken caption; distinct marker per state |
| Calendar | Today, selected date, success, incomplete, missed, paused, rest day, future; readable legend on detail |
| OutcomeModal | Binary Build, binary Quit, and numeric counter; saving and retry states |
| RewardCard | Locked and unlocked; reward is a personal promise, with no purchasing or redemption service |
| EmptyState | First commitment, no status matches, no history, nothing due today |

## Motion specification

Motion communicates changes without delaying use. The values below are project choices, not information encoded in static screenshots.

| Interaction | Motion / timing | Feedback |
| --- | --- | --- |
| Raised button press | Face moves toward backing x=2/y=2 over 80 ms; returns over 120 ms | Selection haptic only for meaningful choices |
| Option selection | Background/text transition over 140 ms | One light selection tick |
| Setup next/back | Content shifts 16 units in travel direction + opacity, 220 ms in / 160 ms out; update step bar over 220 ms | No haptic on every navigation step |
| Screen push/pop | Native stack transition, approximately 220 ms where configurable | Android back returns naturally |
| Modal open/close | Opacity + scale 0.97 to 1, 200 ms in / 150 ms out; backdrop 160 ms | Dismiss through close, outside tap, or back when idle |
| Checkbox / count success | Check appears with small scale settle; progress fills over 240 ms | Success haptic after persisted result |
| Filter / list changes | 160 ms exit, 200 ms entry, 220 ms layout movement | Preserve scroll and focus where possible |
| Active / paused / broken | Badge and caption crossfade over 180 ms; marker changes without unrelated movement | Light feedback on pause/resume; restrained feedback on failure |
| Final lock | Lock closes with brief 280 ms settle after successful save | One confirmation haptic |
| Reward unlock | Gift/lock indicator changes over 300 ms | One success haptic |

Use opacity and transform for most animation. Cancel or retarget an in-flight transition when state changes again; do not queue repeated celebrations. Keep inputs responsive while saving, disable duplicate submission, and distinguish provisional local feedback from confirmed outcomes.

Reduced motion: remove translation, scaling, springing, and layout movement; use immediate updates or a fade no longer than 100 ms. Haptics have a separate user preference. Moving between background and foreground must not replay all entry animations.

## Reference map and coverage

| Images | Purpose |
| --- | --- |
| 1–2 | Authentication and empty Focus |
| 3–4 | Build/Quit selection states |
| 5 | Target and description |
| 6–7 | Duration and custom calendar |
| 8–10 | Pace and its editors |
| 11 | Reward selection |
| 12–13 | Review and final lock |
| 14–15, 17, 25 | Dashboard and filtered states |
| 16, 19–20 | Broken, active, paused detail |
| 18, 26–27 | Binary and numeric daily logging |
| 21 | Reflection and restart |
| 22–23 | Palette, components, typography |
| 24 | Superseded navigation concept |

## Visual acceptance checklist

- Compare screenshots at matching logical widths against each canonical reference; inspect layout, line breaks, border offsets, colors, and icon scale.
- Exclude editor selection frames and contradictory mock data from comparison.
- Verify empty, selected, active, paused, broken, saving, error, keyboard-open, and large-text states.
- Confirm the two cream canvas palettes and the hard shadows render consistently on Android.
- Confirm font match during Phase 2; raster sources alone cannot prove the original font or all exact dimensions.
- History, Settings, authentication support screens, and Completed states are derived screens, identified in the screen specification; they have no complete supplied mockup.

## Implementation notes through Phase 4

- Shared UI consumes the semantic colors from `design-tokens.json`. Inter regular/medium/semibold/bold is bundled locally, with only the four used weights and the Feather icon font imported.
- Path choice cards use a 120-unit minimum height; pace choices use a compact 84-unit variant. Setup panels use a 480-unit minimum content region with scrolling on compact screens.
- Custom duration replaces the contents of setup step 3 with the date range and calendar, matching image 7; it is not a separate overlay. The step footer advances after validating the selected range.
- The user approved local testing before connecting Supabase. Auth includes Continue on this device and a clear local-storage description, an intentional extension to image 1 for this test round.
- Pressed button feedback, short setup fades, and animated progress are included. The complete motion/haptic pass remains Phase 6.
- Browser screenshots at `artifacts/phase-4/` were reviewed against the references. Final font identity, safe areas, keyboard behavior, and pixel calibration still require an Android device comparison.
- Lifecycle controls and negative outcome actions await Phase 5; their absence in this test build is tracked in `docs/testing.md`.

## Implementation notes through Phase 6

- The Phase 4 boundary above is historical. Paused and Broken details follow images 20 and 16; reflection follows 21, including the four reason tiles, optional custom note, cream panel and raised primary action. Skip reflection is a quiet secondary action.
- Detail now explains frozen deadlines, failure reasons and final catch-up, with dated attempt history, private saved reflection and previous/new attempt links. These supporting states are derived extensions of the references.
- Calendar distinguishes successful, missed and frozen dates; timeline ordinal freezes with pauses and at the logical failure date. Completed rewards use the existing card palette and an earned indicator.
- Shared motion follows the Phase 1 timing direction: 80/120 ms press, 140 ms selection, 220/160 ms wizard, 200/150 ms modal, 200/160/220 ms list entry/exit/layout, 180 ms state fade, 240 ms progress and 280 ms lock settle. Reward/count/check feedback uses a restrained 300 ms settle. Native stack timing remains platform-dependent.
- System reduced-motion changes are observed while running. Users can also force reduced motion; translation/scale/layout motion is removed and fades are at most 80 ms. Haptics have an independent persisted switch and are emitted only after confirmed writes for success/failure actions.
- Settings adds opt-in reminders, time entry, native test reminder, permission/retry status and device settings access. The browser and Expo Go explain that delivery requires a compatible LockIn development build on the test phone.
- Phase 6 screenshots are stored in `artifacts/phase-6/`. Native font/geometry, animation feel and haptic delivery remain Android device checks; no pixel-perfect native claim is made.

