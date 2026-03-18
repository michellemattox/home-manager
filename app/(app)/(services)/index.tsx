import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getYear, parseISO } from "date-fns";
import { useHouseholdStore } from "@/stores/householdStore";
import { useServiceRecords, useUpdateServiceRecord, useDeleteServiceRecord } from "@/hooks/useServices";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SpendChart } from "@/components/ui/SpendChart";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { showConfirm, showAlert } from "@/lib/alert";
import { formatDate } from "@/utils/dateUtils";
import { centsToDisplay, displayToCents } from "@/utils/currencyUtils";
import { SERVICE_TYPES } from "@/types/app.types";
import type { ServiceRecord } from "@/types/app.types";

function ServiceRow({
  record,
  onEdit,
  onDelete,
}: {
  record: ServiceRecord;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <TouchableOpacity onPress={onEdit}>
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
    </TouchableOpacity>
  );
}

export default function ServicesScreen() {
  const router = useRouter();
  const { vendor: initialVendor } = useLocalSearchParams<{ vendor?: string }>();
  const { household } = useHouseholdStore();
  const { data: records, isLoading, refetch } = useServiceRecords(household?.id);
  const updateRecord = useUpdateServiceRecord();
  const deleteRecord = useDeleteServiceRecord();
  const [showChart, setShowChart] = useState(true);
  const [vendorFilter, setVendorFilter] = useState<string | null>(initialVendor ?? null);

  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [editVendor, setEditVendor] = useState("");
  const [editServiceType, setEditServiceType] = useState("Other");
  const [editDate, setEditDate] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openEdit = (record: ServiceRecord) => {
    setEditingRecord(record);
    setEditVendor(record.vendor_name);
    setEditServiceType(record.service_type);
    setEditDate(record.service_date);
    setEditCost((record.cost_cents / 100).toFixed(2));
    setEditNotes(record.notes ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !editVendor.trim()) return;
    try {
      await updateRecord.mutateAsync({
        id: editingRecord.id,
        updates: {
          vendor_name: editVendor.trim(),
          service_type: editServiceType,
          service_date: editDate,
          cost_cents: displayToCents(editCost),
          notes: editNotes.trim() || null,
        },
      });
      setEditingRecord(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        ListHeaderComponent={
          records && records.length > 0 ? (
            <View className="mb-4">
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
          <ServiceRow
            record={item}
            onEdit={() => openEdit(item)}
            onDelete={() => handleDelete(item)}
          />
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

      {/* Edit Modal */}
      <Modal
        visible={!!editingRecord}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingRecord(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingRecord(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Record</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text className="text-blue-600 text-base font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Input
              label="Vendor / Company Name"
              value={editVendor}
              onChangeText={setEditVendor}
              placeholder="e.g. ABC Plumbing"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Service Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {SERVICE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setEditServiceType(type)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${
                    editServiceType === type
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editServiceType === type ? "text-white" : "text-gray-700"}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <DateInput
              label="Service Date"
              value={editDate}
              onChange={setEditDate}
            />

            <Input
              label="Total Cost"
              value={editCost}
              onChangeText={setEditCost}
              keyboardType="decimal-pad"
              placeholder="125.00"
            />

            <Input
              label="Notes (optional)"
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              numberOfLines={3}
              placeholder="What was repaired, warranty info..."
            />

            <Button
              title="Save Changes"
              onPress={handleSaveEdit}
              loading={updateRecord.isPending}
            />
            <TouchableOpacity
              onPress={() => {
                if (!editingRecord) return;
                showConfirm(
                  "Delete record?",
                  `Remove ${editingRecord.vendor_name}?`,
                  () => {
                    deleteRecord.mutate({ id: editingRecord.id, householdId: editingRecord.household_id });
                    setEditingRecord(null);
                  },
                  true
                );
              }}
              className="mt-3 items-center py-3"
            >
              <Text className="text-red-500 font-medium">Delete Record</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
