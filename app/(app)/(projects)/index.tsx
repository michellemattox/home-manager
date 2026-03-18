import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useProjects } from "@/hooks/useProjects";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { MemberAvatarGroup } from "@/components/ui/MemberAvatar";
import { formatDate, formatDateTime } from "@/utils/dateUtils";
import type { ProjectWithOwners, ProjectStatus, ProjectPriority } from "@/types/app.types";

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: any }> = {
  in_progress: { label: "In Progress", variant: "info" },
  planned: { label: "Planned", variant: "default" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  finished: { label: "Finished", variant: "success" },
};

const PRIORITY_CONFIG: Record<ProjectPriority, { label: string; variant: any }> = {
  high: { label: "High", variant: "danger" },
  medium: { label: "Medium", variant: "warning" },
  low: { label: "Low", variant: "default" },
};

const OPEN_STATUSES: ProjectStatus[] = ["in_progress", "planned", "on_hold"];

type SortOption = "newest" | "oldest" | "priority";

function ProjectCard({ project }: { project: ProjectWithOwners }) {
  const router = useRouter();
  const { members } = useHouseholdStore();

  const owners = (project.project_owners ?? [])
    .map((po) => members.find((m) => m.id === po.member_id))
    .filter(Boolean) as any[];

  const latestUpdate = (project.project_updates ?? []).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];

  const updateAuthor = latestUpdate
    ? members.find((m) => m.id === latestUpdate.author_id)
    : null;

  const sc = STATUS_CONFIG[project.status];
  const pc = PRIORITY_CONFIG[project.priority];

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/(projects)/${project.id}`)}
    >
      <Card className="mb-3">
        {/* Header row */}
        <View className="flex-row items-start justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={2}>
            {project.title}
          </Text>
          <MemberAvatarGroup members={owners} />
        </View>

        {/* Badges */}
        <View className="flex-row gap-2 flex-wrap mb-2">
          <Badge label={sc.label} variant={sc.variant} size="sm" />
          <Badge label={pc.label} variant={pc.variant} size="sm" />
          {project.expected_date && (
            <Badge
              label={`Due ${formatDate(project.expected_date)}`}
              variant="default"
              size="sm"
            />
          )}
        </View>

        {/* Latest update */}
        {latestUpdate ? (
          <View className="mt-1 pt-2 border-t border-gray-100">
            <Text className="text-xs text-gray-400 mb-0.5">
              {formatDateTime(latestUpdate.created_at)}
              {updateAuthor ? ` · ${updateAuthor.display_name}` : ""}
            </Text>
            <Text className="text-sm text-gray-600" numberOfLines={2}>
              {latestUpdate.body}
            </Text>
          </View>
        ) : (
          <View className="mt-1 pt-2 border-t border-gray-100">
            <Text className="text-xs text-gray-400 italic">No updates yet</Text>
          </View>
        )}
      </Card>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { data: projects, isLoading, refetch } = useProjects(household?.id);

  const [showFinished, setShowFinished] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filterOwner, setFilterOwner] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<ProjectPriority | null>(null);

  const filtered = useMemo(() => {
    if (!projects) return [];
    let list = projects.filter((p) =>
      showFinished
        ? p.status === "finished" || p.status === "completed"
        : OPEN_STATUSES.includes(p.status as ProjectStatus)
    );

    if (filterOwner) {
      list = list.filter((p) =>
        (p.project_owners ?? []).some((po) => po.member_id === filterOwner)
      );
    }
    if (filterPriority) {
      list = list.filter((p) => p.priority === filterPriority);
    }

    return [...list].sort((a, b) => {
      if (sortBy === "newest")
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === "oldest")
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      // priority: high > medium > low
      const ORDER = { high: 0, medium: 1, low: 2 };
      return ORDER[a.priority] - ORDER[b.priority];
    });
  }, [projects, showFinished, sortBy, filterOwner, filterPriority]);

  const openCount = (projects ?? []).filter((p) =>
    OPEN_STATUSES.includes(p.status as ProjectStatus)
  ).length;

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View>
          <Text className="text-2xl font-bold text-gray-900">Projects</Text>
          {openCount > 0 && (
            <Text className="text-xs text-gray-400">{openCount} open</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(projects)/new")}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter bar */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="border-b border-gray-100 bg-white"
        contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 8, gap: 8 }}
      >
        {/* Open / Finished toggle */}
        <TouchableOpacity
          onPress={() => setShowFinished(false)}
          className={`px-3 py-1.5 rounded-full border ${
            !showFinished ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
          }`}
        >
          <Text className={`text-sm font-medium ${!showFinished ? "text-white" : "text-gray-600"}`}>
            Open
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowFinished(true)}
          className={`px-3 py-1.5 rounded-full border ${
            showFinished ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
          }`}
        >
          <Text className={`text-sm font-medium ${showFinished ? "text-white" : "text-gray-600"}`}>
            Finished
          </Text>
        </TouchableOpacity>

        {/* Divider */}
        <View className="w-px bg-gray-200 mx-1" />

        {/* Sort */}
        {(["newest", "oldest", "priority"] as SortOption[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSortBy(s)}
            className={`px-3 py-1.5 rounded-full border ${
              sortBy === s ? "bg-gray-800 border-gray-800" : "bg-white border-gray-200"
            }`}
          >
            <Text className={`text-sm font-medium ${sortBy === s ? "text-white" : "text-gray-600"}`}>
              {s === "newest" ? "Newest" : s === "oldest" ? "Oldest" : "Priority"}
            </Text>
          </TouchableOpacity>
        ))}

        {/* Divider */}
        <View className="w-px bg-gray-200 mx-1" />

        {/* Priority filter */}
        {(["high", "medium", "low"] as ProjectPriority[]).map((p) => {
          const active = filterPriority === p;
          return (
            <TouchableOpacity
              key={p}
              onPress={() => setFilterPriority(active ? null : p)}
              className={`px-3 py-1.5 rounded-full border ${
                active
                  ? p === "high"
                    ? "bg-red-500 border-red-500"
                    : p === "medium"
                    ? "bg-amber-500 border-amber-500"
                    : "bg-gray-600 border-gray-600"
                  : "bg-white border-gray-200"
              }`}
            >
              <Text className={`text-sm font-medium ${active ? "text-white" : "text-gray-600"}`}>
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}

        {/* Divider */}
        {members.length > 0 && <View className="w-px bg-gray-200 mx-1" />}

        {/* Owner filter */}
        {members.map((m) => {
          const active = filterOwner === m.id;
          return (
            <TouchableOpacity
              key={m.id}
              onPress={() => setFilterOwner(active ? null : m.id)}
              className={`px-3 py-1.5 rounded-full border ${
                active ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
              }`}
            >
              <Text className={`text-sm font-medium ${active ? "text-white" : "text-gray-600"}`}>
                {m.display_name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-4 pt-3 pb-8"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        renderItem={({ item }) => <ProjectCard project={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={showFinished ? "No finished projects" : "No open projects"}
              subtitle={
                showFinished
                  ? "Finished projects will appear here."
                  : "Add a project to start tracking home improvements."
              }
              actionLabel={showFinished ? undefined : "Add Project"}
              onAction={
                showFinished
                  ? undefined
                  : () => router.push("/(app)/(projects)/new")
              }
              icon="🏗️"
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
