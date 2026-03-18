import React from "react";
import { View, Text, ScrollView } from "react-native";
import { format, subMonths, startOfMonth, parseISO } from "date-fns";
import { centsToDisplay } from "@/utils/currencyUtils";
import type { ServiceRecord } from "@/types/app.types";

interface Props {
  records: ServiceRecord[];
  months?: number;
}

export function SpendChart({ records, months = 12 }: Props) {
  // Build buckets for the last N months
  const now = new Date();
  const buckets = Array.from({ length: months }, (_, i) => {
    const month = startOfMonth(subMonths(now, months - 1 - i));
    return {
      label: format(month, "MMM"),
      year: format(month, "yyyy"),
      key: format(month, "yyyy-MM"),
      total: 0,
    };
  });

  records.forEach((r) => {
    const key = r.service_date.slice(0, 7); // "yyyy-MM"
    const bucket = buckets.find((b) => b.key === key);
    if (bucket) bucket.total += r.cost_cents;
  });

  const maxTotal = Math.max(...buckets.map((b) => b.total), 1);
  const hasData = buckets.some((b) => b.total > 0);

  if (!hasData) {
    return (
      <View className="items-center py-6">
        <Text className="text-gray-400 text-sm">
          No spend data yet — add service records to see trends.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, alignItems: "flex-end" }}
      style={{ height: 120 }}
    >
      {buckets.map((b) => {
        const heightPct = b.total > 0 ? b.total / maxTotal : 0;
        const barHeight = Math.max(Math.round(heightPct * 72), b.total > 0 ? 4 : 0);

        return (
          <View
            key={b.key}
            className="items-center mx-1"
            style={{ width: 32 }}
          >
            {b.total > 0 && (
              <Text
                className="text-gray-500 mb-0.5"
                style={{ fontSize: 8, textAlign: "center" }}
                numberOfLines={1}
              >
                {centsToDisplay(b.total, true)}
              </Text>
            )}
            <View style={{ height: 72, justifyContent: "flex-end" }}>
              <View
                className={b.total > 0 ? "bg-blue-500 rounded-t" : ""}
                style={{ height: barHeight, width: 24 }}
              />
            </View>
            <Text className="text-gray-400 mt-1" style={{ fontSize: 9 }}>
              {b.label}
            </Text>
          </View>
        );
      })}
    </ScrollView>
  );
}
