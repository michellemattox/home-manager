import React, { useRef, useEffect } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { scanStore } from "@/utils/scanStore";

export default function ScanBarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cooldown = useRef(false);
  const requested = useRef(false);

  // Auto-request permission as soon as the hook has loaded
  useEffect(() => {
    if (requested.current) return;
    if (permission === null) return; // still loading — wait for next render
    if (permission.granted) return;  // already granted — nothing to do
    if (permission.canAskAgain === false) return; // permanently denied — show UI
    requested.current = true;
    requestPermission();
  }, [permission]);

  function goBack() {
    router.back();
  }

  function handleBarcode(data: string) {
    if (cooldown.current) return;
    cooldown.current = true;
    scanStore.barcode = data;
    router.back();
  }

  // Still determining permission status
  if (permission === null) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#4ade80" />
      </SafeAreaView>
    );
  }

  // Permanently denied — must go to Settings
  if (!permission.granted && permission.canAskAgain === false) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-8" edges={["top"]}>
        <Text className="text-white text-lg font-semibold text-center mb-3">Camera Access Needed</Text>
        <Text className="text-gray-400 text-sm text-center mb-6">
          Camera permission was permanently denied. Enable it in your device settings.
        </Text>
        <TouchableOpacity onPress={() => Linking.openSettings()} className="bg-green-600 rounded-xl px-6 py-3 mb-3">
          <Text className="text-white font-semibold">Open Settings</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={goBack}>
          <Text className="text-gray-400 text-sm">Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Not yet granted — show spinner while system dialog is open
  if (!permission.granted) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center px-8" edges={["top"]}>
        <ActivityIndicator color="#4ade80" size="large" />
        <Text className="text-gray-400 text-sm text-center mt-4">Waiting for camera permission…</Text>
        <TouchableOpacity onPress={goBack} className="mt-6">
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
