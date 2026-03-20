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

There are no test or lint scripts configured.

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

### State Management
- `authStore` — Supabase session + user
- `householdStore` — current household, members list, current member, and `householdChecked` flag (set to `true` once the household lookup after login completes — used by AuthGate to avoid premature redirects)
- `notificationStore` — notification preferences (persisted via Zustand persist middleware)

### Supabase Client (`src/lib/supabase.ts`)
Platform-aware storage: `expo-secure-store` on native, `localStorage` on web. `detectSessionInUrl` is enabled for web to pick up auth tokens from URL hash after email invite redirects.

### Row-Level Security
All tables use RLS. The `is_household_member(household_id)` function is the main gate — it checks `household_members` for the current `auth.uid()`. Policies that deviate from this pattern are noted in the migration that creates them.

### Database Migrations
Sequential SQL files in `supabase/migrations/` (001–019). Run new migrations manually in the **Supabase SQL Editor** (the CLI `db` commands require Docker). Always create a new numbered file rather than editing existing ones.

### Edge Functions
Located in `supabase/functions/`. Two deployed functions:
- **`invite-member`** — Sends invite email. For new users: `auth.admin.inviteUserByEmail`. For existing Supabase Auth users: `auth.admin.generateLink` (magic link). Returns `{ existingUser: true, actionLink }` for existing users; the app copies the invite token to clipboard instead of relying on the email.
- **`send-reminders`** — Sends Expo push notifications for overdue/upcoming recurring tasks.

Deploy with `--no-verify-jwt` (both functions are called with the user's session token but the function itself uses the service role key internally).

### Path Alias
`@/*` maps to `src/*` (configured in `tsconfig.json` and `babel.config.js`). Use `@/lib/supabase`, `@/hooks/useHousehold`, etc.

### Type Files
- `src/types/database.types.ts` — Auto-generated Supabase types. Update manually when adding columns.
- `src/types/app.types.ts` — Composed/derived types used throughout the app (e.g. `ProjectWithOwners`, `TripWithTasks`).

### Key Data Model Notes
- `ideas` use `topic_id` as `household_id` (legacy column name — not a real topic foreign key)
- `household_invites` has `UNIQUE(household_id, email)` — delete the existing record before re-inviting the same email
- `household_members` has an `invite_token` column used for pending placeholder rows; filter with `.is("invite_token", null)` to get real members
- Service records have a `frequency` column (`monthly | quarterly | bi-annually | yearly`) used to compute next-due dates client-side on the Home dashboard
