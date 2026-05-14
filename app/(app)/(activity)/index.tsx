import React, { useMemo, useState } from "react";
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
import { useFilterStore } from "@/stores/filterStore";
import { useTrips, useAllTripTasks } from "@/hooks/useTrips";
import { useAppRefresh } from "@/hooks/useAppRefresh";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { matchesQuery } from "@/utils/searchUtils";
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
  const { household, members } = useHouseholdStore();
  const { data: trips, isLoading } = useTrips(household?.id);
  const { data: allTripTasks = [] } = useAllTripTasks(household?.id);
  const { refreshing, onRefresh } = useAppRefresh();
  const [searchQuery, setSearchQuery] = useState("");
  const { memberFilter, toggleMember } = useFilterStore();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const activityActiveFilterCount = memberFilter.length > 0 ? 1 : 0;

  // Set of trip_ids that have at least one matching checklist item
  const tripIdsMatchingChecklist = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return null;
    const set = new Set<string>();
    for (const t of allTripTasks) {
      if (matchesQuery(q, t.title, t.checklist_name)) {
        set.add(t.trip_id);
      }
    }
    return set;
  }, [allTripTasks, searchQuery]);

  const tripMatches = (t: Trip) => {
    // Member filter: include if assigned to a selected member, or marked "all" (household-wide).
    if (memberFilter.length > 0) {
      const assigned = (t as any).assigned_to as string | null;
      const ok = assigned === "all" || (assigned && memberFilter.includes(assigned));
      if (!ok) return false;
    }
    if (!searchQuery.trim()) return true;
    if (matchesQuery(searchQuery, t.title, t.destination, (t as any).notes)) return true;
    return tripIdsMatchingChecklist?.has(t.id) ?? false;
  };

  const now = new Date();
  const upcoming = (trips ?? [])
    .filter((t) => !isBefore(parseISO(t.return_date), now) && tripMatches(t))
    .sort((a, b) => parseISO(a.departure_date).getTime() - parseISO(b.departure_date).getTime());
  const past = (trips ?? [])
    .filter((t) => isBefore(parseISO(t.return_date), now) && tripMatches(t))
    .sort((a, b) => parseISO(b.departure_date).getTime() - parseISO(a.departure_date).getTime());

  return (
    <SafeAreaView className="flex-1 bg-[#FADCDF]" edges={["top"]}>
      <AppHeader compact />
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-xl font-bold text-gray-900">Activity</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(activity)/new")}
          className="bg-blue-600 rounded-full px-4 py-2"
        >
          <Text className="text-white text-sm font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      <View className="px-4 pb-2">
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search activities..."
        />
      </View>

      {/* Filters button + collapsible panel */}
      <View className="px-4 pt-1">
        <TouchableOpacity
          onPress={() => setFiltersOpen((v) => !v)}
          className="flex-row items-center self-start gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-300"
        >
          <Text className="text-xs font-semibold text-gray-700">Filters</Text>
          {activityActiveFilterCount > 0 && (
            <View className="bg-blue-600 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
              <Text className="text-white text-[10px] font-bold">{activityActiveFilterCount}</Text>
            </View>
          )}
          <Text className="text-gray-500 text-xs">{filtersOpen ? "˅" : "›"}</Text>
        </TouchableOpacity>
      </View>

      {filtersOpen && (
        <View className="px-4 pt-2 pb-3">
          <View className="flex-row items-center">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide" style={{ width: 72 }}>Member</Text>
            <View className="flex-row flex-wrap gap-2">
              {members.map((m) => {
                const active = memberFilter.includes(m.id);
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => toggleMember(m.id)}
                    className={`px-3 py-1 rounded-full border ${active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
                  >
                    <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-600"}`}>{m.display_name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      )}

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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
