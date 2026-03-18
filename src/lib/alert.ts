import { Alert, Platform } from "react-native";

/**
 * Cross-platform alert — uses window.alert/confirm on web,
 * Alert.alert on native.
 */
export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

export function showConfirm(
  title: string,
  message: string | undefined,
  onConfirm: () => void,
  destructive = false
) {
  if (Platform.OS === "web") {
    const msg = message ? `${title}\n\n${message}` : title;
    if (window.confirm(msg)) onConfirm();
  } else {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      {
        text: destructive ? "Delete" : "OK",
        style: destructive ? "destructive" : "default",
        onPress: onConfirm,
      },
    ]);
  }
}
