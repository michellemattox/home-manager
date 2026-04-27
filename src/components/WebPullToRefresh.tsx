import React, { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// Web-only pull-to-refresh. React Native's RefreshControl doesn't fire
// touch gestures on Android Chrome / PWA, so we listen at the document
// level, detect a top-of-scroll pull, and hard-reload the PWA with a
// cache-busting query param to guarantee a fresh HTML + JS bundle.
export function WebPullToRefresh() {
  const [pullY, setPullY] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const pullYRef = useRef(0);
  const startYRef = useRef<number | null>(null);

  const TRIGGER = 60;   // pullY pixels to cross (~120px finger travel)
  const MAX = 140;

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const getPageScrollTop = () =>
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    const findScrollable = (el: EventTarget | null): HTMLElement | null => {
      let node = el as HTMLElement | null;
      while (node && node !== document.body && node !== document.documentElement) {
        const style = window.getComputedStyle(node);
        const o = style.overflowY;
        if ((o === "auto" || o === "scroll") && node.scrollHeight > node.clientHeight) {
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
      const atTop = sc ? sc.scrollTop <= 0 : getPageScrollTop() <= 0;
      startYRef.current = atTop ? e.touches[0].clientY : null;
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

    const doRefresh = () => {
      setRefreshing(true);
      // Cache-bust so Chrome reliably fetches the latest HTML + bundle
      // hash. location.reload() can reuse bfcache / disk cache on PWAs.
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("_r", String(Date.now()));
        window.location.replace(url.toString());
      } catch {
        window.location.reload();
      }
    };

    const onEnd = () => {
      const triggered = startYRef.current != null && pullYRef.current >= TRIGGER;
      startYRef.current = null;
      setPull(0);
      if (triggered) doRefresh();
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
  }, []);

  if (Platform.OS !== "web") return null;

  const readyToRelease = pullY >= TRIGGER;
  const visible = refreshing || pullY > 4;
  const translate = refreshing ? 40 : pullY;
  const progress = Math.min(pullY / TRIGGER, 1);

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
          top: -44,
          transform: `translateY(${translate}px)`,
          transition:
            refreshing || startYRef.current == null
              ? "transform 0.25s ease-out"
              : "none",
          width: 40,
          height: 40,
          borderRadius: 20,
          background: readyToRelease ? "#16a34a" : "white",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: visible ? 1 : 0,
        }}
      >
        <div
          style={{
            width: 20,
            height: 20,
            borderRadius: 10,
            border: "2.5px solid " + (readyToRelease ? "rgba(255,255,255,0.4)" : "#e5e7eb"),
            borderTopColor: readyToRelease ? "white" : "#16a34a",
            animation: refreshing ? "wptr-spin 0.8s linear infinite" : "none",
            transform: refreshing ? "none" : `rotate(${progress * 360}deg)`,
            transition: refreshing ? "none" : "transform 0.05s linear",
          }}
        />
      </div>
      <style>{`@keyframes wptr-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
