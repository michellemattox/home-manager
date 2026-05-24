# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Start development server (web runs at localhost:8081)
npm start

# Start with cache cleared
npx expo start --clear

# Deploy an Edge Function (Docker not required)
SUPABASE_ACCESS_TOKEN=<token> npx supabase functions deploy <function-name> --project-ref sjtlmvcxcffftsdleftf --no-verify-jwt

# Push code (triggers Vercel auto-deploy)
git push origin master
```

There are no test or lint scripts configured. This is an Expo/React Native app — **not Next.js**. Ignore any "use client" validation suggestions.

## Architecture

### Stack
- **Expo SDK 55 / React Native 0.83** with **Expo Router v3** (file-based routing)
- **Supabase** for database, auth, and Edge Functions (Deno runtime)
- **NativeWind** (Tailwind CSS for React Native)
- **Zustand** for global state, **TanStack Query v5** for server state with AsyncStorage persistence
- **react-hook-form + zod** for form validation
- Deployed on **Vercel** (web) at `https://home-manager-michellemattoxs-projects.vercel.app`

### Routing & Auth Gate
`app/_layout.tsx` contains `AuthGate`, which runs on every route change and enforces:
- No session → redirect to `/(auth)/login`
- Session, no household → redirect to `/(auth)/onboarding`
- Session + household → redirect to `/(app)/(home)`
- **Exceptions**: `segments[0] === "join"` is allowed through all gates (invite flow)

The `app/join.tsx` file at the root handles invite acceptance and is the only route outside `(auth)` and `(app)`.

### Tab Structure (`app/(app)/_layout.tsx`)
8 tabs: **Home, Ideas, Tasks, Projects, Activity, Goals, Garden, Travel**. Services and Vendors are separate tab-bar entries but visually hidden (no label). Settings is a push screen from Home.

### Data Layer
All Supabase queries go through hooks in `src/hooks/`. Every hook follows the same pattern:
- `useQuery` for reads, `useMutation` for writes
- Mutations call `queryClient.invalidateQueries` on success to refresh dependent data
- `queryKey` arrays always include `householdId` so data is scoped per household

### Undo Pattern
Destructive actions (completing tasks, deleting items) use an optimistic undo pattern via `src/stores/undoStore.ts`:
1. Optimistically remove item from the query cache
2. Schedule the real DB operation on a 2-second delay
3. Show `UndoToast` — if tapped, restore the item to cache and cancel the DB write
4. If a second delete arrives before the timer, the first one flushes immediately

Used in: `useRecurringTasks`, `useProjectTasks`, `useTasks`, `useGoals`, `useGarden`, `useServices`, `useIdeas`, `useTrips`.

### Completed Checklist Items
When project/trip checklist items are marked done, they're archived to `completed_checklist_items` (not just toggled). The `useCompleteProjectChecklistItem` and `useCompleteTripChecklistItem` hooks handle archival. `useUncompleteChecklistItem` restores them to their original table with all metadata (owner, due date, checklist name).

### State Management
- `authStore` — Supabase session + user
- `householdStore` — current household, members list, current member, and `householdChecked` flag (set to `true` once the household lookup after login completes — used by AuthGate to avoid premature redirects)
- `notificationStore` — notification preferences (persisted via Zustand persist middleware). `notifyMemberIds` controls which members' tasks appear in notifications; supports multi-select with "all" + individual IDs
- `filterStore` — persistent member filter (`memberFilter: string[]`) shared across Home and Tasks tabs, persisted via Zustand + AsyncStorage. Empty array = show all
- `undoStore` — manages optimistic undo with 2-second delay (see Undo Pattern above). The `UndoToast` progress bar `DURATION` constant must stay in sync with this value.
- `customRemediesStore` — per-device store of user-added pest/disease remedies (Zustand + AsyncStorage). Keyed by issue name → string[] of remedies. Used by the Garden pest log to auto-append user-typed remedies back into the chip picker on the next visit.

### Supabase Client (`src/lib/supabase.ts`)
Platform-aware storage: `expo-secure-store` on native, `localStorage` on web. `detectSessionInUrl` is enabled for web to pick up auth tokens from URL hash after email invite redirects.

### Row-Level Security
All tables use RLS. The `is_household_member(household_id)` function is the main gate — it checks `household_members` for the current `auth.uid()`. Policies that deviate from this pattern are noted in the migration that creates them.

### Database Migrations
Sequential SQL files in `supabase/migrations/` (latest file is highest numbered — check `ls supabase/migrations/ | tail -1`). Run new migrations manually in the **Supabase SQL Editor** (the CLI `db` commands require Docker). Always create a new numbered file rather than editing existing ones.

### Edge Functions
Located in `supabase/functions/`. Deployed functions:
- **`invite-member`** — Sends invite email. For new users: `auth.admin.inviteUserByEmail`. For existing Supabase Auth users: `auth.admin.generateLink` (magic link). Returns `{ existingUser: true, actionLink }` for existing users; the app copies the invite token to clipboard instead of relying on the email.
- **`send-reminders`** — Member-first email digest + Expo push notifications. Loads all notification preferences, filters to members eligible at the current Pacific Time hour, then fetches and groups tasks. Members with no tasks get an "all caught up" email. Uses `last_digest_sent_at` for idempotency.
- **`generate-wow`** / **`garden-advisor`** / **`parse-task`** / **`identify-pest`** / **`garden-weather`** — AI-powered features using OpenAI/external APIs.

Deploy with `--no-verify-jwt` (both functions are called with the user's session token but the function itself uses the service role key internally).

### Date/Time Conventions
- All date logic uses **Pacific Time** (America/Los_Angeles). See `src/utils/dateUtils.ts`.
- Times are stored and displayed in **12-hour format** (e.g., "9am", "2:30pm").
- `taskBadgeLabel()` produces compact date/time strings like "Overdue · 4/9 @ 9am" or "Tomorrow @ 2pm".
- The `send-reminders` edge function computes PT hours/days via `Intl.DateTimeFormat`.
- **4-tier due date system**: `dueTier()` returns `"overdue" | "due_today" | "due_tomorrow" | "due_soon" | null`. Badge variants map to: overdue→danger (red), due_today→orange, due_tomorrow→yellow, due_soon→green.

### Frequency / Repeat Picker
`src/components/ui/RepeatPicker.tsx` provides `RepeatPickerModal` for selecting task repeat frequency. Returns `{ frequencyType, frequencyDays, label }`. Frequency types are the DB enum: `daily | weekly | monthly | yearly | custom | no_repeat`. Sub-options include day-of-week multi-select, day-of-month (week + day), and custom (number + unit).

### Rich Text Notes
Activity (trip) notes and Garden pest logs support rich text via `react-native-pell-rich-editor`. Components:
- `RichTextEditor` — toolbar with Bold, Italic, Underline, Ordered List, Bullet List
- `RichTextViewer` — renders HTML (WebView on native, `dangerouslySetInnerHTML` on web)
- `plainTextToHtml()` / `htmlToPlainText()` — conversion utilities for migrating existing plain text notes
- Notes are stored as HTML in the `notes` column
- When opening an editor for a record that predates rich text, wrap the existing value with `plainTextToHtml(log.notes ?? "")` in your reset/initializer — the helper is a no-op if the value already contains HTML tags.

### Home Page Data Aggregation
The Home screen (`app/(app)/(home)/index.tsx`) pulls data from multiple tabs:
- Recurring tasks and one-off tasks from the Tasks tab
- Projects with due dates from the Projects tab
- Project checklist items (via `useAllProjectTasks`) and trip checklist items (via `useAllTripTasks`)
- Service records with computed next-due dates
- Each item shows a source type label (Task, Project, Activity) and a Done button for inline completion

Items in every tier (Needs Attention, Due Today, Due Tomorrow, Coming Up) flow through a tagged-union `HomeItem` type and the `sortItems` comparator: **date first** (YYYY-MM-DD lex via `getItemDate`) then **time within date** (`parseTimeToMinutes` → `-1` for no-time, so untimed items sort to the top of their date group). Project cards (`expected_date`) interleave with tasks instead of pinning to the top — any code that spreads project cards in front of `buildTierItems` must end the array with `.sort(sortItems)`.

### Pull-to-Refresh
Two parallel implementations because RN's `RefreshControl` doesn't fire touch gestures on Android Chrome / PWA:
- **Native** uses `RefreshControl` + `useAppRefresh` (`src/hooks/useAppRefresh.ts`), which calls `qc.refetchQueries({ type: "active" })` so the spinner stays up until data has actually round-tripped (don't use `invalidateQueries` here — its promise resolves before refetches finish in some cases).
- **Web** uses `WebPullToRefresh` (`src/components/WebPullToRefresh.tsx`), a document-level touch listener mounted in `app/(app)/_layout.tsx`. On release, it does `window.location.replace(url + "?_r=" + Date.now())` — `location.reload()` can be served from bfcache/disk cache on PWAs, which is why the green-circle overlay was previously appearing without an actual refresh.

### Goals — Recurring Period Buttons
Recurring goals on the Goals tab show two action buttons per card: **Week Achieved** (indigo, ✓) and **Week Missed** (rose, 😞). Both call `useCompleteGoalPeriod`; pass `missed: true` for the miss path. The auto-inserted `goal_updates` body comes from `buildPeriodMessage(freqType, freqDays, dueDate, missed)` and is frequency-aware: "Goal achieved/was not achieved for the week of …", "for April 2026", "for 2026", etc. Both paths advance `due_date` to the next cycle. Only the achieved path triggers the celebration animation + success haptic.

Deleting a period update from the Edit Update modal: detected by `PERIOD_UPDATE_RE` matching the body. Goes through `useDeleteGoalPeriodUpdate` (no undo toast — the rollback IS the recovery), which deletes the row AND rolls `due_date` back one period via `previousPeriodDate`. Regular (user-typed) updates fall through to `useDeleteGoalUpdate` with the standard 2-second undo flow. Caveat: the rollback always subtracts one period from the current `due_date`, so deleting a non-most-recent period update will land the goal in the wrong cycle — fix would be to add a `period_due_date` column on `goal_updates`.

### Auto-Save Pattern
Task edit modals (low-lift, standalone, project-adjacent) in the Tasks tab use a 3-second debounced auto-save:
- `useRef` tracks the initial values when the modal opens (`llInitialRef`, `stInitialRef`, `paInitialRef`)
- A `useEffect` watches all editable fields, compares against initial values for dirty detection
- On dirty, sets a 3-second timeout to call the save function; clears previous timeout on each change
- "Done" button flushes any pending save immediately before closing
- After save, the initial ref is updated to the new values so the next dirty check works correctly

### Multi-Select Filter Pattern
Member filters across Home and Tasks tabs use `filterStore` (Zustand + AsyncStorage) for persistence. The store provides `memberFilter: string[]` (empty = All), `toggleMember(id)`, and `setMemberFilter(ids)`. Settings "Notify me about" has a "Select Multiples" checkbox that toggles between single-select (one at a time) and multi-select (combine "All" + individuals).

Gift filters use the same pattern via `src/stores/giftFilterStore.ts` (`recipientFilter`, `sortMode`, `filtersOpen` persisted; search text is session-only).

### Cross-Tab Back Navigation
`src/stores/navStore.ts` keeps two values: `lastTabRoute` (the tab the user is currently on) and `previousTabRoute` (the tab before that). `src/hooks/useTrackLastTab.ts` is mounted in `app/(app)/_layout.tsx` and updates them whenever `useSegments()` resolves to a tab index (e.g. `["(app)", "(home)"]`, length 2). Detail screens override the Back chevron:

- `app/(app)/(projects)/[id].tsx` and `app/(app)/(activity)/[id].tsx` define `handleBack = () => router.replace(lastTabRoute)` so Back returns to wherever the user came from.
- `app/(app)/(tasks)/index.tsx` opens a modal in-place when arriving via `?openTaskId` / `?openStandaloneId` / `?focus` (deep links from Home). The deep-link effects set `cameFromDeepLink.current = true`; closing the modal calls `router.replace(previousTabRoute)` so the user returns to Home instead of being stranded on the Tasks tab.

### Time Inputs
`src/utils/dateUtils.ts` exports two normalizers — they have non-interchangeable roles:

- `normalizeTimeTo24h(input)` → `"HH:MM:SS"` or `null`. Accepts `"6pm"`, `"8am"`, `"5 PM"`, `"2:30pm"`, `"18:00"`, `"18:00:00"`. **Always use this before writing to Postgres `TIME` columns** (`time_of_day` on `recurring_tasks`, `due_time` on `tasks`). Postgres TIME rejects the bare `"6pm"` form.
- `normalizeTimeTo12h(input)` → compact display string like `"6pm"` / `"2:30pm"`. Use for rendering only.

### Recurring Task Save Invariant
When saving a recurring task (both `app/(app)/(tasks)/index.tsx` `doSaveLowLift` and `app/(app)/(tasks)/new.tsx` `onSubmitLowLift`), `next_due_date` is computed via `firstFutureOccurrence(freqType, freqDays, anchorLocal, rule)` from `src/utils/scheduleUtils.ts`. This always returns a date ≥ today, walking forward from the anchor by the cadence step until reaching today (or using the rule's first matching day-of-week / Nth-weekday). Never write `next_due_date = anchor` directly — editing a past-anchored task would snap the badge backwards.

### Vendor Sync to Project Edit Modal
The project Edit modal vendor chip picker reads from `usePreferredVendors(household?.id)`. To keep it fresh when vendors are added elsewhere:

- `app/(app)/(projects)/[id].tsx` declares `const qc = useQueryClient()` **before** the `useFocusEffect` that invalidates `["preferred_vendors", householdId]` and calls `refetchVendors()` — declaring after produced a "Cannot access 'ce' before initialization" TDZ crash in production builds.
- The Edit-modal seeding `useEffect` also calls `refetchVendors()` when `showEditModal` flips to true.
- Direct `supabase.from("preferred_vendors").insert(...)` calls (e.g. the inline "Other" vendor path) must `qc.invalidateQueries({ queryKey: ["preferred_vendors", householdId] })` themselves since they bypass `useAddPreferredVendor`.
- The Vendors tab `handleSave` awaits `qc.invalidateQueries(...)` before closing the modal so the "From Service History" list reflects the move into "My Vendors" immediately.

### Monthly Scorecard
`src/hooks/useSeasonScore.ts` counts completed projects by `completed_at` — the `projects` table has no `updated_at` column, so an earlier version that filtered on `updated_at` always returned 0. Project `completed_at` is set in `app/(app)/(projects)/[id].tsx` `handleStatusChange` when status flips to `completed`/`finished`.

### Personal Task Privacy
`recurring_tasks` and `tasks` tables have an `is_personal` boolean column. When `is_personal` is true, the task is only visible to the assigned member. Filtering is done client-side via the `isVisible(assignedMemberId, isPersonal)` helper in Home and Tasks tabs. Edit modals expose a "Personal Task" Switch toggle.

### Realtime
`src/hooks/useRealtimeInvalidate.ts` subscribes to Supabase realtime channels and invalidates relevant query keys when rows change. `useHomeRealtime` is an alias for the global realtime hook.

### Path Alias
`@/*` maps to `src/*` (configured in `tsconfig.json` and `babel.config.js`). Use `@/lib/supabase`, `@/hooks/useHousehold`, etc.

### Type Files
- `src/types/database.types.ts` — Auto-generated Supabase types. Update manually when adding columns.
- `src/types/app.types.ts` — Composed/derived types used throughout the app (e.g. `ProjectWithOwners`, `TripWithTasks`).

### Local Catalogs (PNW / Seattle Zone 8b)
`src/lib/seattlePestData.ts` exports `PNW_PESTS`, `PNW_DISEASES`, `PNW_DEFICIENCIES` — each an array of `{ name, remedies[] }` sourced from WSU / OSU / Tilth Alliance guidance. Use `getCatalogFor(logType)` to get the right list for a Pest-log type, and `getRemediesFor(name)` to look up default remedies. The Garden pest form combines catalog remedies with user-added ones from `customRemediesStore` to build its Remedy chip picker.

### Chip Picker + Custom Fallback Pattern
Used in the Garden pest log (Name and Remedy fields). Two pieces:
1. Render a row of chips from a catalog; tapping a chip calls `setState(chip.value)`.
2. Below the chips, show a plain `<Input>` bound to the same state. A chip is "selected" iff `state === chip.value`. The user can tap a chip OR type freely; typing deselects all chips automatically.

This keeps state simple (one string, no separate "custom mode" flag) and handles AI auto-fill cleanly (the returned name either matches a chip or simply shows in the input).

### Key Data Model Notes
- `ideas` use `topic_id` as `household_id` (legacy column name — not a real topic foreign key)
- `household_invites` has `UNIQUE(household_id, email)` — delete the existing record before re-inviting the same email
- `household_members` has an `invite_token` column used for pending placeholder rows; filter with `.is("invite_token", null)` to get real members
- Service records have a `frequency` column (`monthly | quarterly | bi-annually | yearly`) used to compute next-due dates client-side on the Home dashboard
