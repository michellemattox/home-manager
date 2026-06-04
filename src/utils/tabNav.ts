import { router } from "expo-router";

type TabRoute =
  | "/(app)/(home)"
  | "/(app)/(ideas)"
  | "/(app)/(tasks)"
  | "/(app)/(projects)"
  | "/(app)/(activity)"
  | "/(app)/(gifts)"
  | "/(app)/(goals)"
  | "/(app)/(garden)"
  | "/(app)/(travel)"
  | "/(app)/(services)"
  | "/(app)/(vendors)";

/**
 * Switch to a tab's index, popping any nested stack screens in the current
 * tab first. In Expo Router v3, `router.replace(tabRoute)` from inside a
 * nested Stack screen on Android often resolves to the tabs navigator's
 * `initialRouteName` (Home) instead of the requested tab — this helper
 * dismisses the current Stack first so the subsequent navigation lands on
 * the intended tab's index.
 */
export function dismissToTab(route: string) {
  try {
    router.dismissAll();
  } catch {
    // dismissAll throws when the current stack has nothing to dismiss; that's fine.
  }
  router.navigate(route as TabRoute);
}
