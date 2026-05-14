import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useHouseholdStore } from "@/stores/householdStore";
import { useLatestWBR, useGenerateWBR } from "@/hooks/useWeeklyBusinessReview";
import { formatDate, formatDateShort } from "@/utils/dateUtils";
import { Card } from "@/components/ui/Card";

function memberName(members: any[], id: string | null): string {
  if (!id) return "Unassigned";
  return members.find((m) => m.id === id)?.display_name ?? "—";
}

function SubHeader({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <View className="flex-row items-center gap-2 mt-3 mb-1">
      <Text className="text-xs font-bold uppercase tracking-wide text-gray-500">{children}</Text>
      <View className="bg-gray-200 rounded-full px-2">
        <Text className="text-xs text-gray-700 font-semibold">{count}</Text>
      </View>
    </View>
  );
}

export function WeeklyBusinessReview() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { data: wbr, isLoading } = useLatestWBR(household?.id);
  const generate = useGenerateWBR();
  const [expanded, setExpanded] = useState(true);

  if (isLoading) return null;
  if (!wbr) {
    return (
      <Card className="mb-3 mt-2">
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="text-sm font-bold uppercase tracking-wide text-gray-700">
              Weekly Business Review
            </Text>
            <Text className="text-xs text-gray-400 mt-1">
              No report yet. The first WBR generates Monday 4pm PT.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => household && generate.mutate(household.id)}
            disabled={generate.isPending}
            className="bg-blue-600 rounded-full px-3 py-1.5"
          >
            <Text className="text-white text-xs font-semibold">
              {generate.isPending ? "Generating…" : "Generate now"}
            </Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  }

  const s = wbr.snapshot;
  const totalItems =
    s.ideas.length +
    s.tasks.length +
    s.projects_upcoming.length +
    s.project_tasks.length +
    s.projects_with_recent_updates.length +
    s.activities.length;

  return (
    <Card className="mb-3 mt-2">
      <TouchableOpacity
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}
        className="flex-row items-center justify-between"
      >
        <View className="flex-1">
          <Text className="text-sm font-bold uppercase tracking-wide text-gray-700">
            Weekly Business Review
          </Text>
          <Text className="text-xs text-gray-400 mt-0.5">
            Week of {formatDate(wbr.week_start)} · {totalItems} items
          </Text>
        </View>
        <Text className="text-gray-500 text-base font-bold ml-2" style={{ width: 18, textAlign: "center" }}>
          {expanded ? "˅" : "›"}
        </Text>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-2">
          {/* Ideas */}
          <SubHeader count={s.ideas.length}>💡 New Ideas (past 2 weeks)</SubHeader>
          {s.ideas.length === 0 ? (
            <Text className="text-xs text-gray-400 italic">No new ideas</Text>
          ) : (
            s.ideas.map((idea) => (
              <TouchableOpacity
                key={idea.id}
                onPress={() => router.push("/(app)/(ideas)")}
                className="py-1.5 border-b border-gray-50"
              >
                <Text className="text-sm text-gray-800" numberOfLines={1}>{idea.subject || idea.body || "Untitled idea"}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {memberName(members, idea.author_id)} · {formatDateShort(idea.created_at)}
                </Text>
              </TouchableOpacity>
            ))
          )}

          {/* Tasks */}
          <SubHeader count={s.tasks.length}>🔔 Tasks (overdue + next 7 days)</SubHeader>
          {s.tasks.length === 0 ? (
            <Text className="text-xs text-gray-400 italic">No upcoming tasks</Text>
          ) : (
            s.tasks.map((task) => {
              const bucketColor =
                task.bucket === "overdue" ? "text-red-500"
                : task.bucket === "due_today" ? "text-orange-500"
                : "text-gray-500";
              return (
                <TouchableOpacity
                  key={`${task.source}:${task.id}`}
                  onPress={() => router.push("/(app)/(tasks)")}
                  className="py-1.5 border-b border-gray-50"
                >
                  <Text className="text-sm text-gray-800" numberOfLines={1}>{task.title}</Text>
                  <View className="flex-row items-center gap-2 mt-0.5">
                    <Text className={`text-xs font-semibold ${bucketColor}`}>
                      {task.bucket === "overdue" ? "Overdue" : task.bucket === "due_today" ? "Today" : formatDateShort(task.due_date)}
                    </Text>
                    {task.time_of_day && (
                      <Text className="text-xs text-gray-400">{task.time_of_day}</Text>
                    )}
                    <Text className="text-xs text-gray-400">· {memberName(members, task.assigned_member_id)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {/* Projects upcoming */}
          <SubHeader count={s.projects_upcoming.length}>🏗️ Projects (next 30 days)</SubHeader>
          {s.projects_upcoming.length === 0 ? (
            <Text className="text-xs text-gray-400 italic">No projects due in the next 30 days</Text>
          ) : (
            s.projects_upcoming.map((p) => (
              <TouchableOpacity
                key={p.id}
                onPress={() => router.push(`/(app)/(projects)/${p.id}`)}
                className="py-1.5 border-b border-gray-50"
              >
                <Text className="text-sm text-gray-800" numberOfLines={1}>{p.title}</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  Due {formatDateShort(p.expected_date)} · {p.owner_ids.map((id) => memberName(members, id)).join(", ") || "Unassigned"}
                </Text>
              </TouchableOpacity>
            ))
          )}

          {/* Project tasks with pending due dates */}
          {s.project_tasks.length > 0 && (
            <>
              <SubHeader count={s.project_tasks.length}>↳ Project tasks with due dates</SubHeader>
              {s.project_tasks.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => router.push(`/(app)/(projects)/${t.project_id}`)}
                  className="py-1.5 border-b border-gray-50"
                >
                  <Text className="text-sm text-gray-800" numberOfLines={1}>{t.title}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {t.project_title} · Due {formatDateShort(t.due_date)} · {memberName(members, t.assigned_member_id)}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Projects with recent updates */}
          {s.projects_with_recent_updates.length > 0 && (
            <>
              <SubHeader count={s.projects_with_recent_updates.length}>↳ Recently updated projects</SubHeader>
              {s.projects_with_recent_updates.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => router.push(`/(app)/(projects)/${p.id}`)}
                  className="py-1.5 border-b border-gray-50"
                >
                  <Text className="text-sm text-gray-800" numberOfLines={1}>{p.title}</Text>
                  <Text className="text-xs text-gray-500 mt-0.5" numberOfLines={2}>{p.latest_update_body}</Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {memberName(members, p.latest_update_author_id)} · {formatDateShort(p.latest_update_at)}
                  </Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {/* Activities */}
          <SubHeader count={s.activities.length}>✈️ Activity (next 90 days)</SubHeader>
          {s.activities.length === 0 ? (
            <Text className="text-xs text-gray-400 italic">No upcoming activities</Text>
          ) : (
            s.activities.map((a) => {
              const ownerLabel = a.assigned_to === "all"
                ? "Household"
                : a.assigned_to
                  ? memberName(members, a.assigned_to)
                  : "Unassigned";
              return (
                <TouchableOpacity
                  key={a.id}
                  onPress={() => router.push("/(app)/(activity)")}
                  className="py-1.5 border-b border-gray-50"
                >
                  <Text className="text-sm text-gray-800" numberOfLines={1}>
                    {a.title}{a.destination && a.destination !== a.title ? ` · ${a.destination}` : ""}
                  </Text>
                  <Text className="text-xs text-gray-400 mt-0.5">
                    {formatDateShort(a.departure_date)}
                    {a.return_date ? ` → ${formatDateShort(a.return_date)}` : ""}
                    {" · "}{ownerLabel}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}

          <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-gray-100">
            <Text className="text-[10px] text-gray-400">
              Generated {formatDate(wbr.generated_at)}
            </Text>
            <TouchableOpacity
              onPress={() => household && generate.mutate(household.id)}
              disabled={generate.isPending}
            >
              <Text className="text-xs text-blue-500 font-medium">
                {generate.isPending ? "Regenerating…" : "↻ Regenerate"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Card>
  );
}
