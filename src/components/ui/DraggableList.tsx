import React, { useRef, useState } from "react";
import { View, Text, Animated, PanResponder, TouchableOpacity } from "react-native";

/**
 * A lightweight reorderable list that supports BOTH drag-and-drop (via a ≡ handle)
 * and ▲▼ arrow buttons. Built on React Native's core PanResponder + Animated APIs
 * so it works on web/PWA and Android with no extra dependencies or root providers.
 *
 * Rows are a fixed height. While a row is dragged it floats above the others and,
 * on release, the new index is computed from the drag distance and committed via
 * onReorder. The arrows move a row one slot at a time.
 */
export type DraggableListProps<T> = {
  data: T[];
  keyExtractor: (item: T) => string;
  renderContent: (item: T, index: number) => React.ReactNode;
  onReorder: (from: number, to: number) => void;
  rowHeight?: number;
};

function Row({
  index,
  count,
  rowHeight,
  onReorder,
  children,
}: {
  index: number;
  count: number;
  rowHeight: number;
  onReorder: (from: number, to: number) => void;
  children: React.ReactNode;
}) {
  const pan = useRef(new Animated.Value(0)).current;
  const [dragging, setDragging] = useState(false);

  // Keep latest values available inside the (memoized) PanResponder closures.
  const idxRef = useRef(index);
  idxRef.current = index;
  const countRef = useRef(count);
  countRef.current = count;
  const cbRef = useRef(onReorder);
  cbRef.current = onReorder;

  const responder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setDragging(true),
      onPanResponderMove: (_e, g) => pan.setValue(g.dy),
      onPanResponderRelease: (_e, g) => {
        const delta = Math.round(g.dy / rowHeight);
        let target = idxRef.current + delta;
        if (target < 0) target = 0;
        if (target > countRef.current - 1) target = countRef.current - 1;
        setDragging(false);
        Animated.timing(pan, { toValue: 0, duration: 120, useNativeDriver: false }).start();
        if (target !== idxRef.current) cbRef.current(idxRef.current, target);
      },
      onPanResponderTerminate: () => {
        setDragging(false);
        Animated.timing(pan, { toValue: 0, duration: 120, useNativeDriver: false }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={{
        transform: [{ translateY: pan }],
        zIndex: dragging ? 50 : 0,
        elevation: dragging ? 8 : 0,
        height: rowHeight,
      }}
      className={`flex-row items-center ${dragging ? "bg-blue-50 rounded-lg" : ""}`}
    >
      {/* Drag handle — only this region captures the pan gesture */}
      <View {...responder.panHandlers} className="px-2 py-2 justify-center">
        <Text className="text-gray-400 text-lg leading-none">≡</Text>
      </View>

      <View className="flex-1 min-w-0">{children}</View>

      {/* Arrow fallback */}
      <View className="flex-row items-center">
        <TouchableOpacity
          disabled={index === 0}
          onPress={() => onReorder(index, index - 1)}
          className="px-2 py-1"
        >
          <Text className={`text-base ${index === 0 ? "text-gray-200" : "text-gray-500"}`}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity
          disabled={index === count - 1}
          onPress={() => onReorder(index, index + 1)}
          className="px-2 py-1"
        >
          <Text className={`text-base ${index === count - 1 ? "text-gray-200" : "text-gray-500"}`}>
            ▼
          </Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export function DraggableList<T>({
  data,
  keyExtractor,
  renderContent,
  onReorder,
  rowHeight = 44,
}: DraggableListProps<T>) {
  return (
    <View>
      {data.map((item, index) => (
        <Row
          key={keyExtractor(item)}
          index={index}
          count={data.length}
          rowHeight={rowHeight}
          onReorder={onReorder}
        >
          {renderContent(item, index)}
        </Row>
      ))}
    </View>
  );
}

/** Pure helper: move an item from one index to another, returning a new array. */
export function moveItem<T>(arr: T[], from: number, to: number): T[] {
  const next = [...arr];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
