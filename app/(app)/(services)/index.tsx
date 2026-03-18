import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getYear, parseISO } from "date-fns";
import { useHouseholdStore } from "@/stores/householdStore";
import { useServiceRecords, useDeleteServiceRecord } from "@/hooks/useServices";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SpendChart } from "@/components/ui/SpendChart";
import { showConfirm } from "@/lib/alert";
import { formatDate } from "@/utils/dateUtils";
import { centsToDisplay } from "@/utils/currencyUtils";
import type { ServiceRecord } from "@/types/app.types";

function ServiceRow({
  record,
  onDelete,
}: {
  record: ServiceRecord;
  onDelete: () => void;
}) {
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
          {record.notes && (
            <Text className="text-sm text-gray-400 mt-1" numberOfLines={2}>
              {record.notes}
            </Text>
          )}
        </View>
        <View className="items-end gap-2">
          <Text className="text-base font-semibold text-gray-800">
            {centsToDisplay(record.cost_cents)}
          </Text>
          <TouchableOpacity onPress={onDelete}>
            <Text className="text-gray-300 text-lg">🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Card>
  );
}

export default function ServicesScreen() {
  const router = useRouter();
  const { vendor: initialVendor } = useLocalSearchParams<{ vendor?: string }>();
  const { household } = useHouseholdStore();
  const { data: records, isLoading, refetch } = useServiceRecords(household?.id);
  const deleteRecord = useDeleteServiceRecord();
  const [showChart, setShowChart] = useState(true);
  const [vendorFilter, setVendorFilter] = useState<string | null>(initialVendor ?? null);

  const sections = useMemo(() => {
    if (!records?.length) return [];
    const filtered = vendorFilter
      ? records.filter((r) => r.vendor_name === vendorFilter)
      : records;
    const byYear: Record<number, ServiceRecord[]> = {};
    filtered.forEach((r) => {
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
  }, [records, vendorFilter]);

  const handleDelete = (record: ServiceRecord) => {
    showConfirm(
      "Delete record?",
      `Remove ${record.vendor_name} — ${centsToDisplay(record.cost_cents)}?`,
      () => deleteRecord.mutate({ id: record.id, householdId: record.household_id }),
      true
    );
  };

  const filteredRecords = vendorFilter
    ? (records ?? []).filter((r) => r.vendor_name === vendorFilter)
    : (records ?? []);
  const totalAllTime = filteredRecords.reduce((s, r) => s + r.cost_cents, 0);

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
        ListHeaderComponent={
          records && records.length > 0 ? (
            <View className="mb-4">
              {/* Vendor filter chip */}
              {vendorFilter && (
                <TouchableOpacity
                  onPress={() => setVendorFilter(null)}
                  className="flex-row items-center self-start bg-blue-100 border border-blue-300 rounded-full px-3 py-1.5 mb-3"
                >
                  <Text className="text-sm text-blue-700 font-medium mr-2">
                    Showing: {vendorFilter}
                  </Text>
                  <Text className="text-blue-500 font-bold">✕</Text>
                </TouchableOpacity>
              )}
              {/* Summary bar */}
              <View className="flex-row mb-3">
                <Card className="flex-1 mr-2 items-center">
                  <Text className="text-xs text-gray-400 mb-1">All-time</Text>
                  <Text className="text-lg font-bold text-gray-900">
                    {centsToDisplay(totalAllTime)}
                  </Text>
                </Card>
                <Card className="flex-1 items-center">
                  <Text className="text-xs text-gray-400 mb-1">Records</Text>
                  <Text className="text-lg font-bold text-gray-900">
                    {filteredRecords.length}
                  </Text>
                </Card>
              </View>

              {/* Chart */}
              <Card>
                <TouchableOpacity
                  onPress={() => setShowChart((v) => !v)}
                  className="flex-row items-center justify-between mb-2"
                >
                  <Text className="text-sm font-semibold text-gray-700">
                    Monthly Spend (12 mo)
                  </Text>
                  <Text className="text-xs text-blue-500">
                    {showChart ? "Hide" : "Show"}
                  </Text>
                </TouchableOpacity>
                {showChart && <SpendChart records={filteredRecords} />}
              </Card>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-center justify-between py-2 bg-gray-50">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </Text>
            <Text className="text-sm font-semibold text-gray-600">
              {centsToDisplay(section.total)}
            </Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ServiceRow record={item} onDelete={() => handleDelete(item)} />
        )}
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
