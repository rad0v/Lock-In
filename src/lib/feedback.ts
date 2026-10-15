import { Platform } from "react-native";
import * as Haptics from "expo-haptics";
let enabled = false;
export function configureHaptics(value: boolean) {
  enabled = value;
}
export function feedback(
  kind: "selection" | "success" | "warning" = "selection",
) {
  if (!enabled || Platform.OS === "web") return;
  const operation =
    kind === "selection"
      ? Haptics.selectionAsync()
      : Haptics.notificationAsync(
          kind === "success"
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
  void operation.catch(() => {});
}
