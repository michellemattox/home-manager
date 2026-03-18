import React, { useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getYear } from "date-fns";
import { parseISO } from "date-fns";
import { useHouseholdStore } from "@/stores/householdStore";
import { useServiceRecords } from "@/hooks/useServices";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/utils/dateUtils";
import { centsToDisplay } from "@/utils/currencyUtils";
import type { ServiceRecord } from "@/types/app.types";

function ServiceRow({ record }: { record: ServiceRecord }) {
  return (
    <Card className="mb-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-gray-900">
            {record.vendor_name}
          </Text>
          <Text className="text-sm text-gray-500">{record.service_type}</Text>
          <Text className="text-xs text-gray-400 mt-0.5">
            {formatDate(record.service_date)}
          </Text>
        </View>
        <Text className="text-base font-semibold text-gray-800">
          {centsToDisplay(record.cost_cents)}
        </Text>
      </View>
      {record.notes && (
        <Text className="text-sm text-gray-400 mt-2" numberOfLines={2}>
          {record.notes}
        </Text>
      )}
    </Card>
  );
}

export default function ServicesScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const { data: records, isLoading, refetch } = useServiceRecords(household?.id);

  const sections = useMemo(() => {
    if (!records?.length) return [];
    const byYear: Record<number, ServiceRecord[]> = {};
    records.forEach((r) => {
      const year = getYear(parseISO(r.service_date));
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(r);
    });
    return Object.entries(byYear)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, items]) => ({
        title: String(year),
        total: items.reduce((s, r) => s + r.cost_cents, 0),
        data: items,
      }));
  }, [records]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Service History</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(services)/new")}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-center justify-between py-2 bg-gray-50">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </Text>
            <Text className="text-sm font-semibold text-gray-600">
              Total: {centsToDisplay(section.total)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => <ServiceRow record={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No service records"
              subtitle="Track contractor visits and home service costs."
              actionLabel="Add Record"
              onAction={() => router.push("/(app)/(services)/new")}
              icon="🔧"
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
