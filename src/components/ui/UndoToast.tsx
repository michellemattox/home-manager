import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useUndoStore } from "@/stores/undoStore";

const DURATION = 5000;

export function UndoToast() {
  const pending = useUndoStore((s) => s.pending);
  const triggerUndo = useUndoStore((s) => s.triggerUndo);
  const [progress, setProgress] = useState(1);
  const startRef = useRef<number>(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!pending) {
      setProgress(1);
      cancelAnimationFrame(rafRef.current);
      return;
    }

    startRef.current = Date.now();
    setProgress(1);

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const remaining = Math.max(0, 1 - elapsed / DURATION);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [pending]);

  if (!pending) return null;

  return (
    <View
      style={{
        position: "absolute",
        bottom: 90,
        left: 16,
        right: 16,
        backgroundColor: "#1f2937",
        borderRadius: 12,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 8,
        zIndex: 9999,
      }}
    >
      {/* Shrinking progress bar at the top */}
      <View style={{ height: 3, backgroundColor: "rgba(255,255,255,0.12)" }}>
        <View
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            backgroundColor: "#FC9853",
          }}
        />
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: "white", fontSize: 14, flex: 1 }}>
          {pending.label} deleted
        </Text>
        <TouchableOpacity
          onPress={triggerUndo}
          style={{
            backgroundColor: "#FC9853",
            borderRadius: 8,
            paddingHorizontal: 16,
            paddingVertical: 6,
            marginLeft: 12,
          }}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={{ color: "white", fontWeight: "700", fontSize: 14 }}>
            Undo
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
