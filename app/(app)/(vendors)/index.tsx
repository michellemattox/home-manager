import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  RefreshControl,
} from "react-native";
import { showAlert, showConfirm } from "@/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useHouseholdStore } from "@/stores/householdStore";
import { usePreferredVendors, useAddPreferredVendor, useUpdatePreferredVendor, useDeletePreferredVendor } from "@/hooks/usePreferredVendors";
import { useServiceRecords } from "@/hooks/useServices";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SERVICE_TYPES, type ServiceType } from "@/types/app.types";
import {
  buildGoogleMapsUrl,
  buildYelpUrl,
  getServiceTypeKeyword,
} from "@/lib/vendorLinks";
import type { PreferredVendor } from "@/types/app.types";

type TabType = "my" | "find";

function VendorCard({
  vendor,
  onEdit,
}: {
  vendor: PreferredVendor;
  onEdit: () => void;
}) {
  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-gray-900">{vendor.name}</Text>
          {vendor.service_type && (
            <Text className="text-sm text-gray-500 mt-0.5">{vendor.service_type}</Text>
          )}
          {vendor.phone && (
            <Text className="text-xs text-blue-600 mt-0.5">{vendor.phone}</Text>
          )}
          {vendor.notes && (
            <Text className="text-xs text-gray-400 mt-1" numberOfLines={2}>{vendor.notes}</Text>
          )}
        </View>
        <TouchableOpacity onPress={onEdit} className="p-1">
          <Text className="text-gray-400">✏️</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function VendorsScreen() {
  const { household } = useHouseholdStore();
  const [activeTab, setActiveTab] = useState<TabType>("my");
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);

  const { data: preferredVendors, isLoading, refetch } = usePreferredVendors(household?.id);
  const { data: serviceRecords } = useServiceRecords(household?.id);
  const addVendor = useAddPreferredVendor();
  const updateVendor = useUpdatePreferredVendor();
  const deleteVendor = useDeletePreferredVendor();

  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<PreferredVendor | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalServiceType, setModalServiceType] = useState<string>("Other");
  const [modalPhone, setModalPhone] = useState("");
  const [modalNotes, setModalNotes] = useState("");

  const openAdd = (prefillName?: string, prefillType?: string) => {
    setEditingVendor(null);
    setModalName(prefillName ?? "");
    setModalServiceType(prefillType ?? "Other");
    setModalPhone("");
    setModalNotes("");
    setShowModal(true);
  };

  const openEdit = (vendor: PreferredVendor) => {
    setEditingVendor(vendor);
    setModalName(vendor.name);
    setModalServiceType(vendor.service_type ?? "Other");
    setModalPhone(vendor.phone ?? "");
    setModalNotes(vendor.notes ?? "");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!modalName.trim() || !household) return;
    try {
      if (editingVendor) {
        await updateVendor.mutateAsync({
          id: editingVendor.id,
          householdId: household.id,
          updates: {
            name: modalName.trim(),
            service_type: modalServiceType || null,
            phone: modalPhone.trim() || null,
            notes: modalNotes.trim() || null,
          },
        });
      } else {
        await addVendor.mutateAsync({
          household_id: household.id,
          name: modalName.trim(),
          service_type: modalServiceType || null,
          phone: modalPhone.trim() || null,
          notes: modalNotes.trim() || null,
        });
      }
      setShowModal(false);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDelete = () => {
    if (!editingVendor || !household) return;
    showConfirm(
      "Remove vendor?",
      `Remove "${editingVendor.name}" from your preferred vendors?`,
      async () => {
        try {
          await deleteVendor.mutateAsync({ id: editingVendor.id, householdId: household.id });
          setShowModal(false);
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
  };

  // Vendors from service history not already in preferred vendors
  const preferredNames = new Set((preferredVendors ?? []).map((v) => v.name.toLowerCase()));
  const historyVendors = useMemo(() => {
    const map: Record<string, string> = {};
    (serviceRecords ?? []).forEach((r) => {
      if (!preferredNames.has(r.vendor_name.toLowerCase())) {
        map[r.vendor_name] = r.service_type;
      }
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [serviceRecords, preferredVendors]);

  const zipCode = household?.zip_code ?? "";

  const handleOpen = (url: string) => {
    if (!zipCode) {
      showAlert("No ZIP Code", "Add your ZIP code in Settings to search nearby vendors.");
      return;
    }
    Linking.openURL(url).catch(() => showAlert("Error", "Could not open link"));
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Vendors</Text>
        {activeTab === "my" && (
          <TouchableOpacity
            onPress={() => openAdd()}
            className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
          >
            <Text className="text-white text-xl font-light">+</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Tab switcher */}
      <View className="flex-row mx-4 mb-3 bg-gray-200 rounded-xl p-1">
        {(["my", "find"] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab ? "bg-white" : ""}`}
          >
            <Text className={`text-sm font-semibold ${activeTab === tab ? "text-gray-900" : "text-gray-500"}`}>
              {tab === "my" ? "My Vendors" : "Find New"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === "my" ? (
        <ScrollView
          contentContainerClassName="px-4 pb-8"
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        >
          {(preferredVendors ?? []).length === 0 && !isLoading ? (
            <EmptyState
              title="No preferred vendors yet"
              subtitle="Add vendors you trust for quick access when creating service records and projects."
              actionLabel="Add Vendor"
              onAction={() => openAdd()}
              icon="⭐"
            />
          ) : (
            (preferredVendors ?? []).map((v) => (
              <VendorCard key={v.id} vendor={v} onEdit={() => openEdit(v)} />
            ))
          )}

          {historyVendors.length > 0 && (
            <>
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">
                From Service History
              </Text>
              {historyVendors.map(([name, serviceType]) => (
                <View key={name} className="flex-row items-center bg-white border border-gray-100 rounded-xl px-3 py-2.5 mb-2">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900">{name}</Text>
                    <Text className="text-xs text-gray-500">{serviceType}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => openAdd(name, serviceType)}
                    className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                  >
                    <Text className="text-blue-700 text-xs font-semibold">+ Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerClassName="px-4 pb-8">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Select Service Type
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mb-6"
          >
            {SERVICE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedType(type)}
                className={`mr-2 px-4 py-2 rounded-xl border ${
                  selectedType === type
                    ? "bg-blue-600 border-blue-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text className={`font-medium text-sm ${selectedType === type ? "text-white" : "text-gray-700"}`}>
                  {type}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedType && (
            <>
              <Text className="text-sm font-semibold text-gray-500 mb-3">
                Search for: {getServiceTypeKeyword(selectedType)}
              </Text>
              <TouchableOpacity
                onPress={() => handleOpen(buildGoogleMapsUrl(getServiceTypeKeyword(selectedType), zipCode))}
              >
                <Card className="mb-3 flex-row items-center">
                  <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-3">
                    <Text className="text-xl">🗺️</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">Open in Google Maps</Text>
                    <Text className="text-sm text-gray-400">Search nearby {selectedType.toLowerCase()} services</Text>
                  </View>
                  <Text className="text-gray-300">›</Text>
                </Card>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleOpen(buildYelpUrl(getServiceTypeKeyword(selectedType), zipCode))}
              >
                <Card className="flex-row items-center">
                  <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center mr-3">
                    <Text className="text-xl">⭐</Text>
                  </View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">Search on Yelp</Text>
                    <Text className="text-sm text-gray-400">Find rated {selectedType.toLowerCase()} contractors</Text>
                  </View>
                  <Text className="text-gray-300">›</Text>
                </Card>
              </TouchableOpacity>
            </>
          )}

          {!selectedType && (
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">🔍</Text>
              <Text className="text-gray-400 text-center">
                Pick a service type above to find local vendors
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setShowModal(false)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">
              {editingVendor ? "Edit Vendor" : "Add Vendor"}
            </Text>
            <TouchableOpacity onPress={handleSave}>
              <Text className="text-blue-600 text-base font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Input
              label="Vendor Name"
              value={modalName}
              onChangeText={setModalName}
              placeholder="e.g. ABC Plumbing"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Service Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {SERVICE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setModalServiceType(type)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${
                    modalServiceType === type
                      ? "bg-blue-600 border-blue-600"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${modalServiceType === type ? "text-white" : "text-gray-700"}`}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Input
              label="Phone (optional)"
              value={modalPhone}
              onChangeText={setModalPhone}
              placeholder="(555) 555-5555"
              keyboardType="phone-pad"
            />

            <Input
              label="Notes (optional)"
              value={modalNotes}
              onChangeText={setModalNotes}
              multiline
              numberOfLines={3}
              placeholder="License #, website, contact name..."
            />

            <Button
              title={editingVendor ? "Save Changes" : "Add Vendor"}
              onPress={handleSave}
              loading={addVendor.isPending || updateVendor.isPending}
            />

            {editingVendor && (
              <TouchableOpacity onPress={handleDelete} className="mt-3 items-center py-3">
                <Text className="text-red-500 font-medium">Remove Vendor</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
