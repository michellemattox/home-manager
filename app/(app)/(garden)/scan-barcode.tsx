import React, { useRef } from "react";
import { View, Text, TouchableOpacity, Platform, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { scanStore } from "@/utils/scanStore";

export default function ScanBarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cooldown = useRef(false);

  function goBack() {
    router.back();
  }

  async function ensurePermission(): Promise<boolean> {
    if (permission?.granted) return true;
    if (permission?.canAskAgain === false) {
      Alert.alert(
        "Camera Permission Required",
        "Camera access was denied. Enable it in Settings → Apps → Home Manager → Permissions → Camera.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Open Settings", onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert("Camera Permission Required", "Camera access is needed to scan barcodes.", [{ text: "OK" }]);
      return false;
    }
    return true;
  }

  function handleBarcode(data: string) {
    if (cooldown.current) return;
    cooldown.current = true;
    scanStore.barcode = data;
    router.back();
  }

  // Show permission UI until granted
  if (!permission?.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-8" edges={["top"]}>
        <Text className="text-white text-lg font-semibold text-center mb-3">Camera Access Needed</Text>
        <Text className="text-gray-400 text-sm text-center mb-6">
          To scan seed packet barcodes, this app needs access to your camera.
        </Text>
        {permission?.canAskAgain !== false ? (
          <TouchableOpacity
            onPress={ensurePermission}
            className="bg-green-600 rounded-xl px-6 py-3 mb-3"
          >
            <Text className="text-white font-semibold">Grant Camera Access</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => Linking.openSettings()}
            className="bg-green-600 rounded-xl px-6 py-3 mb-3"
          >
            <Text className="text-white font-semibold">Open Settings</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={goBack}>
          <Text className="text-gray-400 text-sm">Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={goBack}>
          <Text className="text-white text-base">Cancel</Text>
        </TouchableOpacity>
        <Text className="text-white font-semibold">Scan Seed Packet Barcode</Text>
        <View style={{ width: 60 }} />
      </View>

      <View className="flex-1">
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"],
          }}
          onBarcodeScanned={(e) => handleBarcode(e.data)}
        />
        {/* Scan guide overlay */}
        <View
          style={{
            position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
            alignItems: "center", justifyContent: "center",
          }}
          pointerEvents="none"
        >
          <View style={{ width: 260, height: 120, borderWidth: 2, borderColor: "#4ade80", borderRadius: 12 }} />
          <Text style={{ color: "#4ade80", marginTop: 12, fontSize: 13, fontWeight: "600" }}>
            Align barcode within the box
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
