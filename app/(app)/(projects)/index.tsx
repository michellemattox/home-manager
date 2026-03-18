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
import { useHouseholdStore } from "@/stores/householdStore";
import { useProjects } from "@/hooks/useProjects";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/utils/dateUtils";
import type { Project, ProjectStatus } from "@/types/app.types";

const STATUS_ORDER: ProjectStatus[] = [
  "in_progress",
  "planned",
  "on_hold",
  "completed",
];

const statusConfig: Record<
  ProjectStatus,
  { label: string; variant: any }
> = {
  in_progress: { label: "In Progress", variant: "info" },
  planned: { label: "Planned", variant: "default" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
};

const priorityConfig = {
  high: { label: "High", variant: "danger" as const },
  medium: { label: "Medium", variant: "warning" as const },
  low: { label: "Low", variant: "default" as const },
};

function ProjectCard({ project }: { project: Project }) {
  const router = useRouter();
  const sc = statusConfig[project.status];
  const pc = priorityConfig[project.priority];

  return (
    <TouchableOpacity
      onPress={() => router.push(`/(app)/(projects)/${project.id}`)}
    >
      <Card className="mb-3">
        <Text className="text-base font-semibold text-gray-900 mb-2">
          {project.title}
        </Text>
        {project.description && (
          <Text className="text-sm text-gray-500 mb-2" numberOfLines={2}>
            {project.description}
          </Text>
        )}
        <View className="flex-row gap-2 flex-wrap">
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
      </Card>
    </TouchableOpacity>
  );
}

export default function ProjectsScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const { data: projects, isLoading, refetch } = useProjects(household?.id);

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    items: (projects ?? []).filter((p) => p.status === status),
  })).filter((g) => g.items.length > 0);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center justify-between px-4 py-3">
        <Text className="text-2xl font-bold text-gray-900">Projects</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(projects)/new")}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={grouped}
        keyExtractor={(g) => g.status}
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        renderItem={({ item: group }) => (
          <View className="mb-4">
            <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              {statusConfig[group.status].label}
            </Text>
            {group.items.map((p) => (
              <ProjectCard key={p.id} project={p} />
            ))}
          </View>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No projects yet"
              subtitle="Track home improvement projects and assign owners."
              actionLabel="Add Project"
              onAction={() => router.push("/(app)/(projects)/new")}
              icon="🏗️"
            />
          ) : null
        }
      />
    </SafeAreaView>
  );
}
