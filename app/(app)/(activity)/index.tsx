import React from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { isBefore, parseISO } from "date-fns";
import { useHouseholdStore } from "@/stores/householdStore";
import { useTrips } from "@/hooks/useTrips";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateShort } from "@/utils/dateUtils";
import type { Trip } from "@/types/app.types";
import { AppHeader } from "@/components/ui/AppHeader";

function ActivityCard({ trip }: { trip: Trip }) {
  const router = useRouter();
  const isPast = isBefore(parseISO(trip.return_date), new Date());

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/(activity)/${trip.id}`)}
    >
      <Card className={`mb-3 ${isPast ? "opacity-60" : ""}`}>
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-base font-semibold text-gray-900">
              {trip.title}
            </Text>
            <Text className="text-sm text-gray-500 mt-0.5">
              {trip.destination}
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              {formatDateShort(trip.departure_date)} →{" "}
              {formatDateShort(trip.return_date)}
            </Text>
            {trip.uses_vendor && (
              <Text className="text-xs text-blue-500 mt-0.5">Has vendor</Text>
            )}
            <Text className="text-xs text-indigo-500 mt-0.5">
              {(trip as any).assigned_to && (trip as any).assigned_to !== "all"
                ? `👤 ${(trip as any).assigned_to}`
                : "👥 All"}
            </Text>
          </View>
          <Text className="text-2xl ml-3">🗓️</Text>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

export default function ActivityScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const { data: trips, isLoading, refetch } = useTrips(household?.id);

  const now = new Date();
  const upcoming = (trips ?? [])
    .filter((t) => !isBefore(parseISO(t.return_date), now))
    .sort((a, b) => parseISO(a.departure_date).getTime() - parseISO(b.departure_date).getTime());
  const past = (trips ?? [])
    .filter((t) => isBefore(parseISO(t.return_date), now))
    .sort((a, b) => parseISO(b.departure_date).getTime() - parseISO(a.departure_date).getTime());

  return (
    <SafeAreaView className="flex-1 bg-[#FCF5EB]" edges={["top"]}>
      <AppHeader compact />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold text-gray-900">Activity</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(activity)/new")}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[
          ...(upcoming.length > 0
            ? [{ type: "header", label: "Upcoming" } as const]
            : []),
          ...upcoming.map((t) => ({ type: "trip" as const, trip: t })),
          ...(past.length > 0
            ? [{ type: "header", label: "Past Activities" } as const]
            : []),
          ...past.map((t) => ({ type: "trip" as const, trip: t })),
        ]}
        keyExtractor={(item, i) =>
          item.type === "trip" ? item.trip.id : `header-${i}`
        }
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        renderItem={({ item }) => {
          if (item.type === "header") {
            return (
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-2">
                {item.label}
              </Text>
            );
          }
          return <ActivityCard trip={item.trip} />;
        }}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No activities yet"
              subtitle="Add a trip or activity and create checklists for it."
              actionLabel="Add Activity"
              onAction={() => router.push("/(app)/(activity)/new")}
              icon="🗓️"
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
