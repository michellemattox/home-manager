import React from "react";
import { View, Text, Pressable, PanResponder, Animated } from "react-native";
import Svg, { Circle, Line, Rect, Path } from "react-native-svg";
import type { GardenArea, GardenBed, GardenHardscape, GardenSupport, GardenCrop } from "@/types/app.types";
import { cropEmoji, findSupport } from "@/lib/gardenCatalog";

// Garden Map v2 canvas. Purely presentational: renders an area's beds,
// hardscape, supports and plant markers positioned in FEET, scaled to pixels.
// Interaction is via callbacks so both the edit screen and the expanded view
// can reuse it.

export type Selected = { type: "bed" | "hardscape" | "support" | "crop"; id: string } | null;

const MATERIAL_STYLE: Record<string, { bg: string; border: string; label: string }> = {
  gravel:     { bg: "#b7b1a4", border: "#8f8878", label: "Gravel" },
  wood_chips: { bg: "#8a5a34", border: "#6d4526", label: "Wood chips" },
  pavers:     { bg: "#c7c1b4", border: "#8f8878", label: "Pavers" },
  flagstone:  { bg: "#b3aa99", border: "#857c6b", label: "Flagstone" },
  mulch:      { bg: "#5a3a1c", border: "#3f2913", label: "Bark mulch" },
  other:      { bg: "#9ca3af", border: "#6b7280", label: "Hardscape" },
};

const GREEN = "#16a34a";

function elementBox(el: { x_ft: number; y_ft: number; width_ft: number | null; length_ft: number | null }, scale: number) {
  return {
    left: el.x_ft * scale,
    top: el.y_ft * scale,
    width: (el.width_ft ?? 1) * scale,
    height: (el.length_ft ?? 1) * scale,
  };
}

// Top-down glyph for a vertical support, drawn to fill its footprint box.
function SupportGlyph({ support, w, h, color }: { support: GardenSupport; w: number; h: number; color: string }) {
  const def = findSupport(support.support_type);
  const footprint = def?.footprint ?? "circle";
  const cx = w / 2, cy = h / 2;
  if (footprint === "line") {
    return (
      <Svg width={w} height={h}>
        <Rect x={1} y={1} width={Math.max(w - 2, 1)} height={Math.max(h - 2, 1)} rx={2} fill={color} opacity={0.25} stroke={color} strokeWidth={1.5} />
        <Line x1={2} y1={cy} x2={w - 2} y2={cy} stroke={color} strokeWidth={1.5} strokeDasharray="3,3" />
      </Svg>
    );
  }
  if (footprint === "rect") {
    return (
      <Svg width={w} height={h}>
        <Rect x={1} y={1} width={Math.max(w - 2, 1)} height={Math.max(h - 2, 1)} rx={3} fill={color} opacity={0.18} stroke={color} strokeWidth={1.5} />
        <Line x1={cx} y1={2} x2={cx} y2={h - 2} stroke={color} strokeWidth={1.2} />
        <Line x1={2} y1={cy} x2={w - 2} y2={cy} stroke={color} strokeWidth={1.2} strokeDasharray="3,3" />
      </Svg>
    );
  }
  // circle footprint (teepee / tower / obelisk / cage / stake): ring + spokes
  const r = Math.max(Math.min(w, h) / 2 - 2, 2);
  return (
    <Svg width={w} height={h}>
      <Circle cx={cx} cy={cy} r={r} fill={color} opacity={0.16} stroke={color} strokeWidth={1.5} strokeDasharray="4,3" />
      <Line x1={cx} y1={cy} x2={cx} y2={cy - r} stroke={color} strokeWidth={1.2} />
      <Line x1={cx} y1={cy} x2={cx - r * 0.85} y2={cy + r * 0.6} stroke={color} strokeWidth={1.2} />
      <Line x1={cx} y1={cy} x2={cx + r * 0.85} y2={cy + r * 0.6} stroke={color} strokeWidth={1.2} />
      <Circle cx={cx} cy={cy} r={2} fill={color} />
    </Svg>
  );
}

// A single element wrapper that supports tap-to-select and drag-to-move.
function DraggableElement({
  selected, interactive, scale, xFt, yFt, onSelect, onMove, style, children,
}: {
  selected: boolean; interactive: boolean; scale: number; xFt: number; yFt: number;
  onSelect: () => void; onMove?: (xFt: number, yFt: number) => void;
  style: any; children: React.ReactNode;
}) {
  const pan = React.useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const draggable = interactive && selected && !!onMove;

  // Recreated each render so it closes over fresh xFt/yFt/scale (a handful of
  // elements, so the cost is negligible and it avoids stale-closure bugs).
  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponder: (_e, g) => draggable && (Math.abs(g.dx) > 4 || Math.abs(g.dy) > 4),
    onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_e, g) => {
      pan.extractOffset();
      pan.setValue({ x: 0, y: 0 });
      pan.setOffset({ x: 0, y: 0 });
      onMove?.(xFt + g.dx / scale, yFt + g.dy / scale);
    },
  });

  return (
    <Animated.View
      {...(draggable ? responder.panHandlers : {})}
      style={[style, { transform: pan.getTranslateTransform() }]}
    >
      <Pressable onPress={interactive ? onSelect : undefined} style={{ width: "100%", height: "100%" }}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

export function GardenCanvas({
  area, beds, hardscape, supports, crops, scale,
  selected, interactive = true, onSelectElement, onCanvasPress, onMoveElement,
}: {
  area: GardenArea;
  beds: GardenBed[];
  hardscape: GardenHardscape[];
  supports: GardenSupport[];
  crops: GardenCrop[];
  scale: number;
  selected?: Selected;
  interactive?: boolean;
  onSelectElement?: (sel: Selected) => void;
  onCanvasPress?: (xFt: number, yFt: number) => void;
  onMoveElement?: (type: "bed" | "hardscape" | "support" | "crop", id: string, xFt: number, yFt: number) => void;
}) {
  const W = area.width_ft * scale;
  const H = area.length_ft * scale;
  const isSel = (type: string, id: string) => selected?.type === type && selected.id === id;

  return (
    <View style={{ width: W, height: H, backgroundColor: "#4b6a36", borderRadius: 10, overflow: "hidden" }}>
      {/* Background captures taps on empty ground */}
      <Pressable
        onPress={(e) => onCanvasPress?.(e.nativeEvent.locationX / scale, e.nativeEvent.locationY / scale)}
        style={{ position: "absolute", inset: 0 }}
      />

      {/* Hardscape (drawn first, ordered by z_index which the query already sorts) */}
      {hardscape.map((h) => {
        const st = MATERIAL_STYLE[h.material] ?? MATERIAL_STYLE.other;
        const box = elementBox(h, scale);
        const sel = isSel("hardscape", h.id);
        return (
          <DraggableElement key={h.id} selected={sel} interactive={interactive} scale={scale}
            xFt={h.x_ft} yFt={h.y_ft} onSelect={() => onSelectElement?.({ type: "hardscape", id: h.id })}
            onMove={(x, y) => onMoveElement?.("hardscape", h.id, x, y)}
            style={{ position: "absolute", ...box }}>
            <View style={{
              flex: 1, backgroundColor: st.bg, borderRadius: h.shape === "circle" ? 999 : 4,
              borderWidth: sel ? 2 : 1, borderColor: sel ? GREEN : st.border,
              alignItems: "center", justifyContent: "center",
            }}>
              {box.width > 44 && (
                <Text style={{ fontSize: 9, fontWeight: "700", color: "rgba(255,255,255,0.9)" }}>{st.label}</Text>
              )}
            </View>
          </DraggableElement>
        );
      })}

      {/* Beds */}
      {beds.map((b) => {
        const box = elementBox(b, scale);
        const sel = isSel("bed", b.id);
        return (
          <DraggableElement key={b.id} selected={sel} interactive={interactive} scale={scale}
            xFt={b.x_ft} yFt={b.y_ft} onSelect={() => onSelectElement?.({ type: "bed", id: b.id })}
            onMove={(x, y) => onMoveElement?.("bed", b.id, x, y)}
            style={{ position: "absolute", ...box }}>
            <View style={{
              flex: 1, backgroundColor: "#6b4e2f", borderRadius: b.shape === "circle" ? 999 : 6,
              borderWidth: 3, borderColor: sel ? GREEN : (b.frame_color || "#B0764A"),
            }}>
              {box.width > 50 && (
                <Text style={{ position: "absolute", top: 3, left: 5, fontSize: 9, fontWeight: "700", color: "#fbefe0" }} numberOfLines={1}>
                  {b.name}
                </Text>
              )}
              {box.width > 60 && b.width_ft && b.length_ft ? (
                <Text style={{ position: "absolute", bottom: 3, right: 5, fontSize: 8, color: "#f3e6d6" }}>
                  {b.width_ft}×{b.length_ft} ft
                </Text>
              ) : null}
            </View>
          </DraggableElement>
        );
      })}

      {/* Supports */}
      {supports.map((s) => {
        const box = elementBox({ x_ft: s.x_ft, y_ft: s.y_ft, width_ft: s.width_ft, length_ft: s.length_ft }, scale);
        const sel = isSel("support", s.id);
        const color = sel ? GREEN : "#e9dcc4";
        return (
          <DraggableElement key={s.id} selected={sel} interactive={interactive} scale={scale}
            xFt={s.x_ft} yFt={s.y_ft} onSelect={() => onSelectElement?.({ type: "support", id: s.id })}
            onMove={(x, y) => onMoveElement?.("support", s.id, x, y)}
            style={{ position: "absolute", ...box }}>
            <View style={{ flex: 1, borderRadius: 4, borderWidth: sel ? 2 : 0, borderColor: GREEN }}>
              <SupportGlyph support={s} w={box.width} h={box.height} color={color} />
            </View>
          </DraggableElement>
        );
      })}

      {/* Crops — one marker per plant, positioned by center */}
      {crops.map((c) => {
        const sel = isSel("crop", c.id);
        const size = Math.max(Math.min(scale * 0.9, 30), 16);
        return (
          <DraggableElement key={c.id} selected={sel} interactive={interactive} scale={scale}
            xFt={c.x_ft} yFt={c.y_ft} onSelect={() => onSelectElement?.({ type: "crop", id: c.id })}
            onMove={(x, y) => onMoveElement?.("crop", c.id, x, y)}
            style={{ position: "absolute", left: c.x_ft * scale - size / 2, top: c.y_ft * scale - size / 2, width: size, height: size }}>
            <View style={{
              flex: 1, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.15)",
              alignItems: "center", justifyContent: "center",
              borderWidth: sel ? 2 : 0, borderColor: "#fff",
            }}>
              <Text style={{ fontSize: size * 0.6 }}>{cropEmoji(c.plant_name)}</Text>
            </View>
          </DraggableElement>
        );
      })}
    </View>
  );
}
