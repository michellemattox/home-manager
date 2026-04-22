import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { useAppRefresh } from "@/hooks/useAppRefresh";

// Web-only pull-to-refresh overlay. React Native's RefreshControl does not
// work as a PWA gesture on Android Chrome, so we wire our own at the
// document level: find the nearest scrollable ancestor of the touch, and
// when it's already scrolled to the top and the user drags down far
// enough, trigger an app-wide refresh.
export function WebPullToRefresh() {
  const { refreshing, onRefresh } = useAppRefresh();
  const [pullY, setPullY] = useState(0);
  const pullYRef = useRef(0);
  const startYRef = useRef<number | null>(null);
  const scrollElRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const TRIGGER = 70;
    const MAX = 120;

    const findScrollable = (el: EventTarget | null): HTMLElement | null => {
      let node = el as HTMLElement | null;
      while (node && node !== document.body) {
        const style = window.getComputedStyle(node);
        const overflowY = style.overflowY;
        if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) {
          return node;
        }
        node = node.parentElement;
      }
      return null;
    };

    const setPull = (y: number) => {
      pullYRef.current = y;
      setPullY(y);
    };

    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const sc = findScrollable(e.target);
      scrollElRef.current = sc;
      if (sc && sc.scrollTop <= 0) {
        startYRef.current = e.touches[0].clientY;
      } else {
        startYRef.current = null;
      }
    };

    const onMove = (e: TouchEvent) => {
      if (startYRef.current == null) return;
      const dy = e.touches[0].clientY - startYRef.current;
      if (dy > 0) {
        setPull(Math.min(dy * 0.5, MAX));
      } else if (dy < 0) {
        startYRef.current = null;
        setPull(0);
      }
    };

    const onEnd = () => {
      const triggered = startYRef.current != null && pullYRef.current > TRIGGER;
      startYRef.current = null;
      setPull(0);
      if (triggered) onRefresh();
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("touchcancel", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
    };
  }, [onRefresh]);

  if (Platform.OS !== "web") return null;

  const visible = refreshing || pullY > 4;
  const translate = refreshing ? 40 : pullY;
  const progress = Math.min(pullY / 70, 1);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 0,
        pointerEvents: "none",
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: -40,
          transform: `translateY(${translate}px)`,
          transition: refreshing ? "transform 0.2s ease-out" : startYRef.current == null ? "transform 0.2s ease-out" : "none",
          width: 36,
          height: 36,
          borderRadius: 18,
          background: "white",
          boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: 9,
            border: "2px solid #e5e7eb",
            borderTopColor: "#16a34a",
            animation: refreshing ? "wptr-spin 0.8s linear infinite" : "none",
            transform: refreshing ? "none" : `rotate(${progress * 360}deg)`,
          }}
        />
      </div>
      <style>{`@keyframes wptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
