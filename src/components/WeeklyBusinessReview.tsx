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

function memberName(members: any[], idOrName: string | null): string {
  if (!idOrName) return "Unassigned";
  const byId = members.find((m) => m.id === idOrName);
  if (byId) return byId.display_name;
  // trips.assigned_to stores a member's DISPLAY NAME, not an id, while every
  // other caller passes an id. Looking up "Michelle" by id found nothing and
  // rendered "—", making assigned trips look unassigned on the WBR.
  const byName = members.find((m) => m.display_name === idOrName);
  return byName ? byName.display_name : "—";
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

          {/* PROJECTS bucket — each project listed with its tasks/updates nested underneath */}
          {(() => {
            const projectMap = new Map<string, {
              id: string;
              title: string;
              expected_date?: string;
              owner_ids?: string[];
              tasks: typeof s.project_tasks;
              update?: typeof s.projects_with_recent_updates[number];
            }>();
            for (const p of s.projects_upcoming) {
              projectMap.set(p.id, { id: p.id, title: p.title, expected_date: p.expected_date, owner_ids: p.owner_ids, tasks: [] });
            }
            for (const t of s.project_tasks) {
              const existing = projectMap.get(t.project_id);
              if (existing) existing.tasks.push(t);
              else projectMap.set(t.project_id, { id: t.project_id, title: t.project_title, tasks: [t] });
            }
            for (const u of s.projects_with_recent_updates) {
              const existing = projectMap.get(u.id);
              if (existing) existing.update = u;
              else projectMap.set(u.id, { id: u.id, title: u.title, tasks: [], update: u });
            }
            const groupedProjects = Array.from(projectMap.values()).sort((a, b) => {
              const ad = a.expected_date ?? "9999-99-99";
              const bd = b.expected_date ?? "9999-99-99";
              return ad.localeCompare(bd);
            });

            return (
              <Bucket
                title="Projects (next 30 days)"
                icon="🏗️"
                bg={BUCKET_BG.projects}
                count={groupedProjects.length}
              >
                {groupedProjects.length === 0 ? (
                  <Text className="text-xs text-gray-500 italic">No project activity</Text>
                ) : (
                  groupedProjects.map((p) => (
                    <View key={p.id} className="py-2 border-b border-black/10">
                      <TouchableOpacity onPress={() => router.push(`/(app)/(projects)/${p.id}`)}>
                        <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>{p.title}</Text>
                        {(p.expected_date || (p.owner_ids && p.owner_ids.length > 0)) && (
                          <Text className="text-xs text-gray-600 mt-0.5">
                            {p.expected_date ? `Due ${formatDateShort(p.expected_date)}` : ""}
                            {p.expected_date && p.owner_ids && p.owner_ids.length > 0 ? " · " : ""}
                            {p.owner_ids && p.owner_ids.length > 0
                              ? p.owner_ids.map((id) => memberName(members, id)).join(", ")
                              : ""}
                          </Text>
                        )}
                      </TouchableOpacity>

                      {p.tasks.length > 0 && (
                        <View className="mt-1.5 ml-2">
                          <Text className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
                            Tasks with due dates
                          </Text>
                          {p.tasks.map((t) => (
                            <TouchableOpacity
                              key={t.id}
                              onPress={() => router.push({ pathname: `/(app)/(projects)/${t.project_id}`, params: { taskId: t.id } })}
                              className="py-1 pl-2 border-l-2 border-black/10"
                            >
                              <Text className="text-xs text-gray-900" numberOfLines={1}>{t.title}</Text>
                              <Text className="text-[11px] text-gray-600 mt-0.5">
                                Due {formatDateShort(t.due_date)} · {memberName(members, t.assigned_member_id)}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}

                      {p.update && (
                        <View className="mt-1.5 ml-2 pl-2 border-l-2 border-black/10">
                          <Text className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
                            Recent update
                          </Text>
                          <Text className="text-xs text-gray-700" numberOfLines={2}>{p.update.latest_update_body}</Text>
                          <Text className="text-[11px] text-gray-600 mt-0.5">
                            {memberName(members, p.update.latest_update_author_id)} · {formatDateShort(p.update.latest_update_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))
                )}
              </Bucket>
            );
          })()}

          <Divider />

          {/* ACTIVITY bucket — each activity listed with its tasks/updates nested underneath */}
          {(() => {
            const activityMap = new Map<string, {
              id: string;
              title: string;
              destination?: string | null;
              departure_date?: string;
              return_date?: string | null;
              assigned_to?: string | null;
              tasks: typeof activityTasks;
              update?: typeof activityUpdates[number];
            }>();
            for (const a of s.activities) {
              activityMap.set(a.id, {
                id: a.id,
                title: a.title,
                destination: a.destination,
                departure_date: a.departure_date,
                return_date: a.return_date,
                assigned_to: a.assigned_to,
                tasks: [],
              });
            }
            for (const t of activityTasks) {
              const existing = activityMap.get(t.trip_id);
              if (existing) existing.tasks.push(t);
              else activityMap.set(t.trip_id, { id: t.trip_id, title: t.trip_title, tasks: [t] });
            }
            for (const u of activityUpdates) {
              const existing = activityMap.get(u.id);
              if (existing) existing.update = u;
              else activityMap.set(u.id, { id: u.id, title: u.title, tasks: [], update: u });
            }
            const groupedActivities = Array.from(activityMap.values()).sort((a, b) => {
              const ad = a.departure_date ?? "9999-99-99";
              const bd = b.departure_date ?? "9999-99-99";
              return ad.localeCompare(bd);
            });

            return (
              <Bucket
                title="Activity (next 90 days)"
                icon="✈️"
                bg={BUCKET_BG.activity}
                count={groupedActivities.length}
              >
                {groupedActivities.length === 0 ? (
                  <Text className="text-xs text-gray-500 italic">No activity</Text>
                ) : (
                  groupedActivities.map((a) => {
                    const ownerLabel = a.assigned_to === "all"
                      ? "Household"
                      : a.assigned_to
                        ? memberName(members, a.assigned_to)
                        : null;
                    return (
                      <View key={a.id} className="py-2 border-b border-black/10">
                        <TouchableOpacity onPress={() => router.push(`/(app)/(activity)/${a.id}`)}>
                          <Text className="text-sm font-semibold text-gray-900" numberOfLines={1}>
                            {a.title}{a.destination && a.destination !== a.title ? ` · ${a.destination}` : ""}
                          </Text>
                          {(a.departure_date || ownerLabel) && (
                            <Text className="text-xs text-gray-600 mt-0.5">
                              {a.departure_date ? formatDateShort(a.departure_date) : ""}
                              {a.departure_date && a.return_date ? ` → ${formatDateShort(a.return_date)}` : ""}
                              {a.departure_date && ownerLabel ? " · " : ""}
                              {ownerLabel ?? ""}
                            </Text>
                          )}
                        </TouchableOpacity>

                        {a.tasks.length > 0 && (
                          <View className="mt-1.5 ml-2">
                            <Text className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
                              Tasks with due dates
                            </Text>
                            {a.tasks.map((t) => (
                              <TouchableOpacity
                                key={t.id}
                                onPress={() => router.push(`/(app)/(activity)/${t.trip_id}`)}
                                className="py-1 pl-2 border-l-2 border-black/10"
                              >
                                <Text className="text-xs text-gray-900" numberOfLines={1}>{t.title}</Text>
                                <Text className="text-[11px] text-gray-600 mt-0.5">
                                  Due {formatDateShort(t.due_date)} · {memberName(members, t.assigned_member_id)}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        )}

                        {a.update && (
                          <View className="mt-1.5 ml-2 pl-2 border-l-2 border-black/10">
                            <Text className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mb-0.5">
                              Recent update
                            </Text>
                            <Text className="text-xs text-gray-700" numberOfLines={2}>{a.update.latest_update_body}</Text>
                            <Text className="text-[11px] text-gray-600 mt-0.5">
                              {memberName(members, a.update.latest_update_author_id)} · {formatDateShort(a.update.latest_update_at)}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </Bucket>
            );
          })()}

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
