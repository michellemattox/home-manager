import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { showAlert } from "@/lib/alert";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { useHouseholdStore } from "@/stores/householdStore";
import { Card } from "@/components/ui/Card";
import { SERVICE_TYPES, type ServiceType } from "@/types/app.types";
import {
  buildGoogleMapsUrl,
  buildYelpUrl,
  getServiceTypeKeyword,
} from "@/lib/vendorLinks";

export default function VendorsScreen() {
  const { household } = useHouseholdStore();
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);

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
      <View className="px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Find Vendors</Text>
        {zipCode ? (
          <Text className="text-sm text-gray-400 mt-0.5">Near {zipCode}</Text>
        ) : (
          <Text className="text-sm text-red-400 mt-0.5">
            Add your ZIP code in Settings
          </Text>
        )}
      </View>

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
              <Text
                className={`font-medium text-sm ${
                  selectedType === type ? "text-white" : "text-gray-700"
                }`}
              >
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
              onPress={() =>
                handleOpen(
                  buildGoogleMapsUrl(
                    getServiceTypeKeyword(selectedType),
                    zipCode
                  )
                )
              }
            >
              <Card className="mb-3 flex-row items-center">
                <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-3">
                  <Text className="text-xl">🗺️</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">
                    Open in Google Maps
                  </Text>
                  <Text className="text-sm text-gray-400">
                    Search nearby {selectedType.toLowerCase()} services
                  </Text>
                </View>
                <Text className="text-gray-300">›</Text>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                handleOpen(
                  buildYelpUrl(
                    getServiceTypeKeyword(selectedType),
                    zipCode
                  )
                )
              }
            >
              <Card className="flex-row items-center">
                <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center mr-3">
                  <Text className="text-xl">⭐</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-semibold text-gray-900">
                    Search on Yelp
                  </Text>
                  <Text className="text-sm text-gray-400">
                    Find rated {selectedType.toLowerCase()} contractors
                  </Text>
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
    </SafeAreaView>
  );
}
