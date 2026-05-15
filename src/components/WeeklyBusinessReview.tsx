import React, { useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useHouseholdStore } from "@/stores/householdStore";
import { useLatestWBR, useGenerateWBR } from "@/hooks/useWeeklyBusinessReview";
import { formatDate, formatDateShort } from "@/utils/dateUtils";
import { Card } from "@/components/ui/Card";

// Bucket colors match each tab's SafeAreaView background.
const BUCKET_BG = {
  ideas: "#FBFCCF",
  tasks: "#F6EDFF",
  projects: "#EBFAFC",
  activity: "#FADCDF",
} as const;

function memberName(members: any[], id: string | null): string {
  if (!id) return "Unassigned";
  return members.find((m) => m.id === id)?.display_name ?? "—";
}

function Bucket({
  title,
  icon,
  bg,
  count,
  children,
  defaultOpen = false,
}: {
  title: string;
  icon: string;
  bg: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <View style={{ backgroundColor: bg }} className="rounded-lg overflow-hidden">
      <TouchableOpacity
        onPress={() => setOpen((v) => !v)}
        activeOpacity={0.7}
        className="flex-row items-center justify-between px-3 py-2"
      >
        <View className="flex-row items-center gap-2 flex-1">
          <Text className="text-sm">{icon}</Text>
          <Text className="text-sm font-bold uppercase tracking-wide text-gray-800">{title}</Text>
          <View className="bg-white/70 rounded-full px-2">
            <Text className="text-xs text-gray-800 font-semibold">{count}</Text>
          </View>
        </View>
        <Text className="text-gray-700 text-base font-bold ml-2" style={{ width: 18, textAlign: "center" }}>
          {open ? "˅" : "›"}
        </Text>
      </TouchableOpacity>
      {open && <View className="px-3 pb-2">{children}</View>}
    </View>
  );
}

function SubGroup({ children, count }: { children: React.ReactNode; count: number }) {
  return (
    <View className="flex-row items-center gap-2 mt-2 mb-1">
      <Text className="text-xs font-bold uppercase tracking-wide text-gray-600">{children}</Text>
      <View className="bg-white/70 rounded-full px-2">
        <Text className="text-xs text-gray-700 font-semibold">{count}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-gray-600 my-3" />;
}

export function WeeklyBusinessReview() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { data: wbr, isLoading } = useLatestWBR(household?.id);
  const generate = useGenerateWBR();
  const [expanded, setExpanded] = useState(false);

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
  const activityTasks = s.activity_tasks ?? [];
  const activityUpdates = s.activities_with_recent_updates ?? [];
  const totalItems =
    s.ideas.length +
    s.tasks.length +
    s.projects_upcoming.length +
    s.project_tasks.length +
    s.projects_with_recent_updates.length +
    s.activities.length +
    activityTasks.length +
    activityUpdates.length;

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
          {/* IDEAS bucket */}
          <Bucket title="New Ideas (Past 3 weeks)" icon="💡" bg={BUCKET_BG.ideas} count={s.ideas.length}>
            {s.ideas.length === 0 ? (
              <Text className="text-xs text-gray-500 italic">No new ideas</Text>
            ) : (
              s.ideas.map((idea) => (
                <TouchableOpacity
                  key={idea.id}
                  onPress={() => router.push({ pathname: "/(app)/(ideas)", params: { focus: idea.id } })}
                  className="py-1.5 border-b border-black/10"
                >
                  <Text className="text-sm text-gray-900" numberOfLines={1}>{idea.subject || idea.body || "Untitled idea"}</Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    {memberName(members, idea.author_id)} · {formatDateShort(idea.created_at)}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </Bucket>

          <Divider />

          {/* TASKS bucket */}
          <Bucket title="Tasks (overdue + next 7 days)" icon="🔔" bg={BUCKET_BG.tasks} count={s.tasks.length}>
            {s.tasks.length === 0 ? (
              <Text className="text-xs text-gray-500 italic">No upcoming tasks</Text>
            ) : (
              s.tasks.map((task) => {
                const bucketColor =
                  task.bucket === "overdue" ? "text-red-600"
                  : task.bucket === "due_today" ? "text-orange-600"
                  : "text-gray-700";
                return (
                  <TouchableOpacity
                    key={`${task.source}:${task.id}`}
                    onPress={() => router.push({ pathname: "/(app)/(tasks)", params: { focus: task.id, kind: task.source } })}
                    className="py-1.5 border-b border-black/10"
                  >
                    <Text className="text-sm text-gray-900" numberOfLines={1}>{task.title}</Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <Text className={`text-xs font-semibold ${bucketColor}`}>
                        {task.bucket === "overdue" ? "Overdue" : task.bucket === "due_today" ? "Today" : formatDateShort(task.due_date)}
                      </Text>
                      {task.time_of_day && (
                        <Text className="text-xs text-gray-600">{task.time_of_day}</Text>
                      )}
                      <Text className="text-xs text-gray-600">· {memberName(members, task.assigned_member_id)}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </Bucket>

          <Divider />

          {/* PROJECTS bucket (contains upcoming + project tasks + recent updates) */}
          <Bucket
            title="Projects (next 30 days)"
            icon="🏗️"
            bg={BUCKET_BG.projects}
            count={s.projects_upcoming.length + s.project_tasks.length + s.projects_with_recent_updates.length}
          >
            {s.projects_upcoming.length === 0 && s.project_tasks.length === 0 && s.projects_with_recent_updates.length === 0 ? (
              <Text className="text-xs text-gray-500 italic">No project activity</Text>
            ) : (
              <>
                {s.projects_upcoming.length > 0 && (
                  <>
                    <SubGroup count={s.projects_upcoming.length}>Upcoming</SubGroup>
                    {s.projects_upcoming.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => router.push(`/(app)/(projects)/${p.id}`)}
                        className="py-1.5 border-b border-black/10"
                      >
                        <Text className="text-sm text-gray-900" numberOfLines={1}>{p.title}</Text>
                        <Text className="text-xs text-gray-600 mt-0.5">
                          Due {formatDateShort(p.expected_date)} · {p.owner_ids.map((id) => memberName(members, id)).join(", ") || "Unassigned"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {s.project_tasks.length > 0 && (
                  <>
                    <SubGroup count={s.project_tasks.length}>Project tasks with due dates</SubGroup>
                    {s.project_tasks.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => router.push({ pathname: `/(app)/(projects)/${t.project_id}`, params: { taskId: t.id } })}
                        className="py-1.5 border-b border-black/10"
                      >
                        <Text className="text-sm text-gray-900" numberOfLines={1}>{t.title}</Text>
                        <Text className="text-xs text-gray-600 mt-0.5">
                          {t.project_title} · Due {formatDateShort(t.due_date)} · {memberName(members, t.assigned_member_id)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {s.projects_with_recent_updates.length > 0 && (
                  <>
                    <SubGroup count={s.projects_with_recent_updates.length}>Recently updated</SubGroup>
                    {s.projects_with_recent_updates.map((p) => (
                      <TouchableOpacity
                        key={p.id}
                        onPress={() => router.push(`/(app)/(projects)/${p.id}`)}
                        className="py-1.5 border-b border-black/10"
                      >
                        <Text className="text-sm text-gray-900" numberOfLines={1}>{p.title}</Text>
                        <Text className="text-xs text-gray-700 mt-0.5" numberOfLines={2}>{p.latest_update_body}</Text>
                        <Text className="text-xs text-gray-600 mt-0.5">
                          {memberName(members, p.latest_update_author_id)} · {formatDateShort(p.latest_update_at)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            )}
          </Bucket>

          <Divider />

          {/* ACTIVITY bucket (upcoming + activity tasks + recent updates) */}
          <Bucket
            title="Activity (next 90 days)"
            icon="✈️"
            bg={BUCKET_BG.activity}
            count={s.activities.length + activityTasks.length + activityUpdates.length}
          >
            {s.activities.length === 0 && activityTasks.length === 0 && activityUpdates.length === 0 ? (
              <Text className="text-xs text-gray-500 italic">No activity</Text>
            ) : (
              <>
                {s.activities.length > 0 && (
                  <>
                    <SubGroup count={s.activities.length}>Upcoming</SubGroup>
                    {s.activities.map((a) => {
                      const ownerLabel = a.assigned_to === "all"
                        ? "Household"
                        : a.assigned_to
                          ? memberName(members, a.assigned_to)
                          : "Unassigned";
                      return (
                        <TouchableOpacity
                          key={a.id}
                          onPress={() => router.push(`/(app)/(activity)/${a.id}`)}
                          className="py-1.5 border-b border-black/10"
                        >
                          <Text className="text-sm text-gray-900" numberOfLines={1}>
                            {a.title}{a.destination && a.destination !== a.title ? ` · ${a.destination}` : ""}
                          </Text>
                          <Text className="text-xs text-gray-600 mt-0.5">
                            {formatDateShort(a.departure_date)}
                            {a.return_date ? ` → ${formatDateShort(a.return_date)}` : ""}
                            {" · "}{ownerLabel}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </>
                )}

                {activityTasks.length > 0 && (
                  <>
                    <SubGroup count={activityTasks.length}>Activity tasks with due dates</SubGroup>
                    {activityTasks.map((t) => (
                      <TouchableOpacity
                        key={t.id}
                        onPress={() => router.push(`/(app)/(activity)/${t.trip_id}`)}
                        className="py-1.5 border-b border-black/10"
                      >
                        <Text className="text-sm text-gray-900" numberOfLines={1}>{t.title}</Text>
                        <Text className="text-xs text-gray-600 mt-0.5">
                          {t.trip_title} · Due {formatDateShort(t.due_date)} · {memberName(members, t.assigned_member_id)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}

                {activityUpdates.length > 0 && (
                  <>
                    <SubGroup count={activityUpdates.length}>Recently updated</SubGroup>
                    {activityUpdates.map((a) => (
                      <TouchableOpacity
                        key={a.id}
                        onPress={() => router.push(`/(app)/(activity)/${a.id}`)}
                        className="py-1.5 border-b border-black/10"
                      >
                        <Text className="text-sm text-gray-900" numberOfLines={1}>{a.title}</Text>
                        <Text className="text-xs text-gray-700 mt-0.5" numberOfLines={2}>{a.latest_update_body}</Text>
                        <Text className="text-xs text-gray-600 mt-0.5">
                          {memberName(members, a.latest_update_author_id)} · {formatDateShort(a.latest_update_at)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </>
                )}
              </>
            )}
          </Bucket>

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
