import React, { useRef, useEffect, useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, TextInput, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions } from "expo-camera";
import { scanStore } from "@/utils/scanStore";

export default function ScanBarcodeScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cooldown = useRef(false);
  const requested = useRef(false);
  const [permissionTimedOut, setPermissionTimedOut] = useState(false);
  // Stable flag — set once, never reset — so the timer effect runs exactly once
  const [requestFired, setRequestFired] = useState(false);
  const [manualBarcode, setManualBarcode] = useState("");

  // Step 1: call requestPermission() as soon as the hook has resolved
  useEffect(() => {
    if (requested.current) return;
    if (permission === null) return;
    if (permission.granted) return;
    if (permission.canAskAgain === false) return;
    requested.current = true;
    requestPermission();
    setRequestFired(true);  // triggers the timer effect below
  }, [permission]);

  // Step 2: separate timer effect keyed on requestFired — NOT on permission.
  // This way, permission changing (even to denied) does NOT cancel the timer.
  useEffect(() => {
    if (!requestFired) return;
    if (permission?.granted) return;
    const timer = setTimeout(() => setPermissionTimedOut(true), 4_000);
    return () => clearTimeout(timer);
  }, [requestFired]); // eslint-disable-line react-hooks/exhaustive-deps

  function goBack() {
    router.back();
  }

  function handleBarcode(data: string) {
    if (cooldown.current) return;
    cooldown.current = true;
    scanStore.barcode = data;
    router.back();
  }

  function submitManual() {
    const upc = manualBarcode.trim().replace(/\D/g, "");
    if (!upc) return;
    handleBarcode(upc);
  }

  // ── Still determining permission ──────────────────────────────────────────
  if (permission === null) {
    return (
      <SafeAreaView className="flex-1 bg-black items-center justify-center" edges={["top"]}>
        <ActivityIndicator color="#4ade80" />
      </SafeAreaView>
    );
  }

  // ── Permanently denied ────────────────────────────────────────────────────
  if (!permission.granted && permission.canAskAgain === false) {
    return <ManualFallback reason="settings" manualBarcode={manualBarcode} setManualBarcode={setManualBarcode} onSubmit={submitManual} onBack={goBack} />;
  }

  // ── Permission request sent but OS dialog never appeared (not in manifest) ─
  if (!permission.granted && permissionTimedOut) {
    return <ManualFallback reason="manifest" manualBarcode={manualBarcode} setManualBarcode={setManualBarcode} onSubmit={submitManual} onBack={goBack} />;
  }

  // ── Waiting for system dialog ─────────────────────────────────────────────
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

  // ── Camera ready ──────────────────────────────────────────────────────────
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
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}
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

function ManualFallback({
  reason,
  manualBarcode,
  setManualBarcode,
  onSubmit,
  onBack,
}: {
  reason: "settings" | "manifest";
  manualBarcode: string;
  setManualBarcode: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
}) {
  const msg =
    reason === "manifest"
      ? "Camera access couldn't be enabled on this build. Enter the barcode number from your seed packet instead."
      : "Camera permission was denied. Enable it in Settings, or enter the barcode number manually.";

  return (
    <SafeAreaView className="flex-1 bg-black items-center justify-center px-8" edges={["top"]}>
      <Text className="text-white text-lg font-semibold text-center mb-3">Camera Unavailable</Text>
      <Text className="text-gray-400 text-sm text-center mb-6">{msg}</Text>

      <View className="w-full bg-gray-900 rounded-xl px-4 py-3 mb-3 flex-row items-center gap-2">
        <TextInput
          className="flex-1 text-white text-base"
          placeholder="Enter barcode / UPC number"
          placeholderTextColor="#6b7280"
          value={manualBarcode}
          onChangeText={setManualBarcode}
          keyboardType="number-pad"
          autoFocus
        />
      </View>

      <TouchableOpacity
        onPress={onSubmit}
        disabled={!manualBarcode.trim()}
        className={`w-full rounded-xl py-3 mb-3 items-center ${manualBarcode.trim() ? "bg-green-600" : "bg-gray-700"}`}
      >
        <Text className={`font-semibold ${manualBarcode.trim() ? "text-white" : "text-gray-500"}`}>
          Look Up Barcode
        </Text>
      </TouchableOpacity>

      {reason === "settings" && (
        <TouchableOpacity onPress={() => Linking.openSettings()} className="mb-3">
          <Text className="text-green-400 text-sm">Open App Settings</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={onBack}>
        <Text className="text-gray-500 text-sm">Cancel</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
