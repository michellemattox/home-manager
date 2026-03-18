import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useProject,
  useAddProjectUpdate,
  useEditProjectUpdate,
  useUpdateProject,
  useDeleteProject,
} from "@/hooks/useProjects";
import {
  useAddProjectTask,
  useCompleteProjectChecklistItem,
  useDeleteProjectTask,
} from "@/hooks/useProjectTasks";
import {
  useCompletedChecklistItems,
  useDeleteCompletedChecklistItem,
} from "@/hooks/useChecklistItems";
import { useServiceRecords } from "@/hooks/useServices";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { showAlert, showConfirm } from "@/lib/alert";
import { MemberAvatar, MemberAvatarGroup } from "@/components/ui/MemberAvatar";
import { formatDateTime, formatDate, formatDateShort } from "@/utils/dateUtils";
import { centsToDisplay, displayToCents } from "@/utils/currencyUtils";
import { PROJECT_CATEGORIES } from "@/types/app.types";
import type { ProjectStatus, ProjectPriority, ProjectTask } from "@/types/app.types";

function isoToDisplay(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

const STATUS_CONFIG: Record<ProjectStatus, { label: string; variant: any }> = {
  planned: { label: "Planned", variant: "default" },
  in_progress: { label: "In Progress", variant: "info" },
  on_hold: { label: "On Hold", variant: "warning" },
  completed: { label: "Completed", variant: "success" },
  finished: { label: "Finished", variant: "success" },
};

const EDITABLE_STATUSES: ProjectStatus[] = ["planned", "in_progress", "on_hold", "finished"];

const PRIORITIES: { label: string; value: ProjectPriority }[] = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
];

function BudgetRow({ budget, total }: { budget: number; total: number }) {
  if (budget === 0 && total === 0) return null;
  const diff = total - budget;
  const pct = budget > 0 ? Math.round(Math.abs(diff) / budget * 100) : null;

  return (
    <View className="gap-1 pt-2 border-t border-gray-100 mt-2">
      {budget > 0 && (
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">Budget</Text>
          <Text className="text-xs font-medium text-gray-700">{centsToDisplay(budget)}</Text>
        </View>
      )}
      {total > 0 && (
        <View className="flex-row justify-between">
          <Text className="text-xs text-gray-500">Total Cost</Text>
          <Text className="text-xs font-medium text-gray-700">{centsToDisplay(total)}</Text>
        </View>
      )}
      {budget > 0 && total > 0 && diff !== 0 && (
        <View className="flex-row justify-between items-center mt-1">
          <Text className={`text-xs font-semibold ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
            {diff > 0 ? "Over budget" : "Under budget"}
          </Text>
          <Text className={`text-xs font-semibold ${diff > 0 ? "text-red-500" : "text-green-600"}`}>
            {centsToDisplay(Math.abs(diff))}{pct !== null ? ` (${pct}%)` : ""}
          </Text>
        </View>
      )}
      {budget > 0 && total > 0 && diff === 0 && (
        <Text className="text-xs text-green-600 font-medium text-right">On budget</Text>
      )}
    </View>
  );
}

export default function ProjectDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: project, isLoading, refetch } = useProject(id);
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const addUpdate = useAddProjectUpdate();
  const editUpdate = useEditProjectUpdate();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const addTask = useAddProjectTask();
  const completeTask = useCompleteProjectChecklistItem();
  const deleteTask = useDeleteProjectTask();
  const deleteCompleted = useDeleteCompletedChecklistItem();
  const { data: completedItems = [] } = useCompletedChecklistItems("project", id);
  const { data: serviceRecords } = useServiceRecords(household?.id);

  const currentMember = members.find((m) => m.user_id === user?.id);

  // Vendor names for contractor quick-pick in edit modal
  const vendorNames = React.useMemo(() => {
    const names = new Set<string>();
    (serviceRecords ?? []).forEach((r) => names.add(r.vendor_name));
    return Array.from(names).sort();
  }, [serviceRecords]);

  // Add update modal
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateText, setUpdateText] = useState("");

  // Edit update modal
  const [editingUpdate, setEditingUpdate] = useState<{ id: string; body: string } | null>(null);
  const [editUpdateText, setEditUpdateText] = useState("");

  // Checklist state
  const [localChecklists, setLocalChecklists] = useState<string[]>(["General"]);
  const [showAddChecklist, setShowAddChecklist] = useState(false);
  const [newChecklistName, setNewChecklistName] = useState("");
  const [addItemChecklist, setAddItemChecklist] = useState<string | null>(null);
  const [addItemTitle, setAddItemTitle] = useState("");
  const [addItemMember, setAddItemMember] = useState<string | null>(null);
  const [addItemDate, setAddItemDate] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  // Edit project modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<ProjectPriority>("medium");
  const [editCategory, setEditCategory] = useState<string | undefined>(undefined);
  const [editDueDate, setEditDueDate] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editTotalCost, setEditTotalCost] = useState("");
  const [editContractor, setEditContractor] = useState("");
  const [editNotes, setEditNotes] = useState("");

  // Realtime subscription
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`project_updates:${id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "project_updates",
        filter: `project_id=eq.${id}`,
      }, () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id]);

  // Seed edit modal
  useEffect(() => {
    if (showEditModal && project) {
      setEditTitle(project.title);
      setEditDescription(project.description ?? "");
      setEditPriority(project.priority as ProjectPriority);
      setEditCategory(project.category ?? undefined);
      setEditDueDate(project.expected_date ?? "");
      setEditBudget(project.estimated_cost_cents ? (project.estimated_cost_cents / 100).toFixed(2) : "");
      setEditTotalCost(project.total_cost_cents ? (project.total_cost_cents / 100).toFixed(2) : "");
      setEditContractor(project.contractor_name ?? "");
      setEditNotes(project.notes ?? "");
    }
  }, [showEditModal]);

  const handleAddUpdate = async () => {
    if (!updateText.trim() || !currentMember || !id) return;
    try {
      await addUpdate.mutateAsync({ project_id: id, author_id: currentMember.id, body: updateText.trim() });
      setUpdateText("");
      setShowUpdateModal(false);
    } catch (e: any) { showAlert("Error", e.message); }
  };

  const handleSaveEditUpdate = async () => {
    if (!editingUpdate || !editUpdateText.trim()) return;
    try {
      await editUpdate.mutateAsync({ id: editingUpdate.id, body: editUpdateText.trim(), projectId: id! });
      setEditingUpdate(null);
      setEditUpdateText("");
    } catch (e: any) { showAlert("Error", e.message); }
  };

  const handleSaveEditProject = async () => {
    if (!editTitle.trim() || !id) return;
    try {
      await updateProject.mutateAsync({
        id,
        updates: {
          title: editTitle.trim(),
          description: editDescription.trim() || null,
          priority: editPriority,
          category: editCategory ?? null,
          expected_date: editDueDate || null,
          estimated_cost_cents: editBudget.trim() ? displayToCents(editBudget) : 0,
          total_cost_cents: editTotalCost.trim() ? displayToCents(editTotalCost) : 0,
          contractor_name: editContractor.trim() || null,
          notes: editNotes.trim() || null,
        },
      });
      setShowEditModal(false);
    } catch (e: any) { showAlert("Error", e.message); }
  };

  const handleStatusChange = async (newStatus: ProjectStatus) => {
    if (!id || !project) return;
    const updates: any = { status: newStatus };
    if (newStatus === "finished" || newStatus === "completed") {
      updates.completed_at = new Date().toISOString();
    } else {
      updates.completed_at = null;
    }
    try {
      await updateProject.mutateAsync({ id, updates });
    } catch (e: any) { showAlert("Error", e.message); }
  };

  const handleDelete = () => {
    if (!project) return;
    showConfirm(
      "Delete project?",
      `"${project.title}" and all its data will be permanently removed.`,
      async () => {
        try {
          await deleteProject.mutateAsync({ id: project.id, householdId: project.household_id });
          router.back();
        } catch (e: any) { showAlert("Error", e.message); }
      },
      true
    );
  };

  const handleAddChecklist = () => {
    const name = newChecklistName.trim();
    if (!name) return;
    if (!localChecklists.includes(name)) {
      setLocalChecklists((prev) => [...prev, name]);
    }
    setNewChecklistName("");
    setShowAddChecklist(false);
  };

  const handleAddChecklistItem = async () => {
    if (!addItemTitle.trim() || !addItemChecklist || !id) return;
    const tasks = (project?.project_tasks ?? []) as ProjectTask[];
    const groupTasks = tasks.filter((t) => (t.checklist_name ?? "General") === addItemChecklist);
    const nextOrder = groupTasks.length > 0
      ? Math.max(...groupTasks.map((t) => t.sort_order)) + 1
      : 0;
    try {
      await addTask.mutateAsync({
        project_id: id,
        title: addItemTitle.trim(),
        sort_order: nextOrder,
        checklist_name: addItemChecklist,
        assigned_member_id: addItemMember,
        due_date: addItemDate || null,
      });
      setAddItemTitle("");
      setAddItemMember(null);
      setAddItemDate("");
      setAddItemChecklist(null);
    } catch (e: any) { showAlert("Error", e.message); }
  };

  const handleCompleteTask = async (task: ProjectTask) => {
    try {
      await completeTask.mutateAsync({
        task,
        completedByMemberId: currentMember?.id ?? null,
      });
    } catch (e: any) { showAlert("Error", e.message); }
  };

  if (!project) return null;

  const owners = (project.project_owners ?? [])
    .map((po: any) => members.find((m) => m.id === po.member_id))
    .filter(Boolean) as any[];

  const sortedUpdates = [...(project.project_updates ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const allTasks: ProjectTask[] = [...((project as any).project_tasks ?? [])];

  // Merge server-side checklist names with local
  const serverChecklistNames = Array.from(new Set(allTasks.map((t) => t.checklist_name ?? "General")));
  const checklistNames = Array.from(new Set([...localChecklists, ...serverChecklistNames]));

  const tasksByChecklist: Record<string, ProjectTask[]> = {};
  for (const name of checklistNames) {
    tasksByChecklist[name] = allTasks
      .filter((t) => (t.checklist_name ?? "General") === name)
      .sort((a, b) => a.sort_order - b.sort_order);
  }

  const isFinished = project.status === "finished" || project.status === "completed";
  const sc = STATUS_CONFIG[project.status];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      {/* Nav bar */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">←</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900" numberOfLines={1}>
          {project.title}
        </Text>
        {!isFinished && (
          <TouchableOpacity onPress={() => setShowEditModal(true)} className="ml-3">
            <Text className="text-blue-600 text-sm font-medium">Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleDelete} className="ml-3">
          <Text className="text-gray-300 text-lg">🗑️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 pb-28">
        {/* Meta card */}
        <Card className="mb-4">
          <View className="flex-row items-start justify-between mb-3">
            <View className="flex-row gap-2 flex-wrap flex-1 mr-2">
              <Badge label={sc.label} variant={sc.variant} />
              <Badge
                label={project.priority.charAt(0).toUpperCase() + project.priority.slice(1)}
                variant={project.priority === "high" ? "danger" : project.priority === "medium" ? "warning" : "default"}
              />
              {project.category && <Badge label={project.category} variant="default" />}
            </View>
            <MemberAvatarGroup members={owners} />
          </View>

          {project.description ? (
            <Text className="text-gray-600 mb-3">{project.description}</Text>
          ) : null}

          {/* Dates */}
          <View className="gap-1 mb-2">
            <Text className="text-xs text-gray-400">Added {formatDateTime(project.created_at)}</Text>
            {project.expected_date && (
              <Text className="text-xs text-gray-600 font-medium">
                Due {formatDate(project.expected_date)}
              </Text>
            )}
            {isFinished && project.completed_at && (
              <Text className="text-xs text-green-600 font-medium">
                Finished {formatDateTime(project.completed_at)}
              </Text>
            )}
          </View>

          {/* Contractor link */}
          {project.contractor_name && (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: "/(app)/(services)",
                  params: { vendor: project.contractor_name! },
                } as any)
              }
              className="flex-row items-center py-2 border-t border-gray-100 mt-2"
            >
              <Text className="text-xs text-gray-500 mr-1">Contractor:</Text>
              <Text className="text-xs font-semibold text-blue-600 flex-1">
                {project.contractor_name}
              </Text>
              <Text className="text-blue-400 text-xs">→ View Services</Text>
            </TouchableOpacity>
          )}

          {/* Budget */}
          <BudgetRow
            budget={project.estimated_cost_cents ?? 0}
            total={project.total_cost_cents ?? 0}
          />

          {/* Status chips */}
          {!isFinished && (
            <View className="mt-3">
              <Text className="text-xs font-medium text-gray-500 mb-2">Change status</Text>
              <View className="flex-row flex-wrap gap-2">
                {EDITABLE_STATUSES.map((s) => {
                  const active = project.status === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => !active && handleStatusChange(s)}
                      className={`px-3 py-1.5 rounded-xl border ${
                        active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                      }`}
                    >
                      <Text className={`text-sm font-medium ${active ? "text-white" : "text-gray-700"}`}>
                        {STATUS_CONFIG[s].label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {isFinished && (
            <TouchableOpacity
              onPress={() => handleStatusChange("in_progress")}
              className="mt-3 self-start px-3 py-1.5 rounded-xl border border-gray-200 bg-white"
            >
              <Text className="text-sm text-gray-600">Reopen project</Text>
            </TouchableOpacity>
          )}
        </Card>

        {/* Notes */}
        {project.notes && (
          <Card className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Notes</Text>
            <Text className="text-sm text-gray-700 leading-relaxed">{project.notes}</Text>
          </Card>
        )}

        {/* Checklists */}
        {checklistNames.map((name) => (
          <View key={name} className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider">{name}</Text>
              {!isFinished && (
                <TouchableOpacity
                  onPress={() => setAddItemChecklist(name)}
                  className="bg-blue-600 rounded-full px-3 py-0.5"
                >
                  <Text className="text-white text-xs font-semibold">+ Add</Text>
                </TouchableOpacity>
              )}
            </View>
            <Card>
              {tasksByChecklist[name].length === 0 ? (
                <Text className="text-gray-400 text-sm text-center py-3">
                  {isFinished ? "No tasks" : "Tap + Add to add items"}
                </Text>
              ) : (
                tasksByChecklist[name].map((task) => {
                  const assignedMember = task.assigned_member_id
                    ? members.find((m) => m.id === task.assigned_member_id)
                    : null;
                  return (
                    <View key={task.id} className="flex-row items-start py-2.5 border-b border-gray-50">
                      <TouchableOpacity
                        onPress={() => handleCompleteTask(task)}
                        className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3 mt-0.5 items-center justify-center"
                      />
                      <View className="flex-1">
                        <Text className="text-sm text-gray-700">{task.title}</Text>
                        <View className="flex-row items-center gap-2 mt-0.5 flex-wrap">
                          {assignedMember && (
                            <View className="flex-row items-center gap-1">
                              <MemberAvatar member={assignedMember} size="sm" />
                              <Text className="text-xs text-gray-400">{assignedMember.display_name.split(" ")[0]}</Text>
                            </View>
                          )}
                          {task.due_date && (
                            <Text className="text-xs text-gray-400">{formatDateShort(task.due_date)}</Text>
                          )}
                        </View>
                      </View>
                      {!isFinished && (
                        <TouchableOpacity
                          onPress={() =>
                            showConfirm("Remove task?", task.title, () =>
                              deleteTask.mutate({ id: task.id, project_id: id! })
                            )
                          }
                          className="ml-2 p-1 mt-0.5"
                        >
                          <Text className="text-gray-300 text-sm">✕</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })
              )}
            </Card>
          </View>
        ))}

        {/* Add Checklist */}
        {!isFinished && (
          showAddChecklist ? (
            <View className="flex-row items-center gap-2 mb-4">
              <TextInput
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
                placeholder="Checklist name (e.g. Materials)"
                value={newChecklistName}
                onChangeText={setNewChecklistName}
                onSubmitEditing={handleAddChecklist}
                autoFocus
                returnKeyType="done"
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                onPress={handleAddChecklist}
                disabled={!newChecklistName.trim()}
                className={`px-3 py-2 rounded-xl ${newChecklistName.trim() ? "bg-blue-600" : "bg-gray-200"}`}
              >
                <Text className={`text-sm font-semibold ${newChecklistName.trim() ? "text-white" : "text-gray-400"}`}>
                  Create
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setShowAddChecklist(false); setNewChecklistName(""); }}>
                <Text className="text-gray-400 text-sm">Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setShowAddChecklist(true)}
              className="flex-row items-center gap-2 mb-4 py-2"
            >
              <Text className="text-blue-600 text-sm font-medium">+ Add Checklist</Text>
            </TouchableOpacity>
          )
        )}

        {/* Completed items */}
        {completedItems.length > 0 && (
          <View className="mb-4">
            <TouchableOpacity
              onPress={() => setShowCompleted(!showCompleted)}
              className="flex-row items-center justify-between mb-2"
            >
              <Text className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                Completed ({completedItems.length})
              </Text>
              <Text className="text-gray-400 text-xs">{showCompleted ? "Hide" : "Show"}</Text>
            </TouchableOpacity>
            {showCompleted && (
              <Card>
                {completedItems.map((item) => (
                  <View key={item.id} className="flex-row items-center py-2 border-b border-gray-50">
                    <View className="w-5 h-5 rounded-full bg-green-500 mr-3 items-center justify-center">
                      <Text className="text-white text-xs font-bold">✓</Text>
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm text-gray-400 line-through">{item.title}</Text>
                      {item.checklist_name && item.checklist_name !== "General" && (
                        <Text className="text-xs text-gray-300">{item.checklist_name}</Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        deleteCompleted.mutate({ id: item.id, sourceType: "project", sourceId: id! })
                      }
                      className="ml-2 p-1"
                    >
                      <Text className="text-gray-300 text-sm">×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </Card>
            )}
          </View>
        )}

        {/* Updates */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            Updates ({sortedUpdates.length})
          </Text>
          {!isFinished && (
            <TouchableOpacity
              onPress={() => setShowUpdateModal(true)}
              className="bg-blue-600 rounded-full px-3 py-1"
            >
              <Text className="text-white text-sm font-medium">+ Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {sortedUpdates.length === 0 ? (
          <Card>
            <Text className="text-gray-400 text-sm text-center py-3">
              No updates yet.{!isFinished ? " Tap + Add to post the first one." : ""}
            </Text>
          </Card>
        ) : (
          sortedUpdates.map((update: any) => {
            const author = members.find((m) => m.id === update.author_id);
            const isMyUpdate = currentMember && update.author_id === currentMember.id;
            return (
              <Card key={update.id} className="mb-3">
                <View className="flex-row items-center mb-2">
                  {author && <MemberAvatar member={author} size="sm" />}
                  <View className="ml-2 flex-1">
                    <Text className="text-xs text-gray-400">
                      {formatDateTime(update.created_at)}
                      {author ? ` · ${author.display_name}` : ""}
                    </Text>
                  </View>
                  {isMyUpdate && !isFinished && (
                    <TouchableOpacity
                      onPress={() => {
                        setEditingUpdate({ id: update.id, body: update.body });
                        setEditUpdateText(update.body);
                      }}
                    >
                      <Text className="text-blue-500 text-xs font-medium">Edit</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <Text className="text-gray-700 text-sm leading-relaxed">{update.body}</Text>
              </Card>
            );
          })
        )}
      </ScrollView>

      {!isFinished && (
        <TouchableOpacity
          onPress={() => setShowUpdateModal(true)}
          className="absolute bottom-8 right-6 bg-blue-600 rounded-full w-14 h-14 items-center justify-center shadow-lg"
        >
          <Text className="text-white text-2xl font-light">+</Text>
        </TouchableOpacity>
      )}

      {/* Add Update modal */}
      <Modal visible={showUpdateModal} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => { setShowUpdateModal(false); setUpdateText(""); }}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">Add Update</Text>
            <TouchableOpacity onPress={handleAddUpdate} disabled={!updateText.trim() || addUpdate.isPending}>
              <Text className={`text-base font-semibold ${updateText.trim() ? "text-blue-600" : "text-gray-300"}`}>Post</Text>
            </TouchableOpacity>
          </View>
          <Text className="text-xs text-gray-400 mb-3">Posting as {currentMember?.display_name ?? "you"}</Text>
          <TextInput
            className="bg-white border border-gray-200 rounded-2xl p-4 text-base text-gray-900 min-h-[120px]"
            placeholder="What's the latest on this project?"
            value={updateText}
            onChangeText={setUpdateText}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </View>
      </Modal>

      {/* Edit Update modal */}
      <Modal visible={!!editingUpdate} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-gray-50 px-4 pt-6">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity onPress={() => { setEditingUpdate(null); setEditUpdateText(""); }}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">Edit Update</Text>
            <TouchableOpacity onPress={handleSaveEditUpdate} disabled={!editUpdateText.trim() || editUpdate.isPending}>
              <Text className={`text-base font-semibold ${editUpdateText.trim() ? "text-blue-600" : "text-gray-300"}`}>Save</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            className="bg-white border border-gray-200 rounded-2xl p-4 text-base text-gray-900 min-h-[120px]"
            value={editUpdateText}
            onChangeText={setEditUpdateText}
            multiline
            autoFocus
            textAlignVertical="top"
          />
        </View>
      </Modal>

      {/* Edit Project modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">Edit Project</Text>
            <TouchableOpacity onPress={handleSaveEditProject} disabled={!editTitle.trim() || updateProject.isPending}>
              <Text className={`text-base font-semibold ${editTitle.trim() ? "text-blue-600" : "text-gray-300"}`}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Text className="text-sm font-medium text-gray-700 mb-1">Title</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              value={editTitle}
              onChangeText={setEditTitle}
              autoFocus
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Description</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4 min-h-[80px]"
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              textAlignVertical="top"
              placeholder="Optional"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Category</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {PROJECT_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setEditCategory(editCategory === cat ? undefined : cat)}
                  className={`px-3 py-1.5 rounded-full border ${
                    editCategory === cat ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editCategory === cat ? "text-white" : "text-gray-700"}`}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm font-medium text-gray-700 mb-2">Priority</Text>
            <View className="flex-row gap-2 mb-4">
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  onPress={() => setEditPriority(p.value)}
                  className={`px-3 py-1.5 rounded-xl border flex-1 items-center ${
                    editPriority === p.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editPriority === p.value ? "text-white" : "text-gray-700"}`}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DateInput
              label="Due Date"
              value={editDueDate}
              onChange={setEditDueDate}
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Budget / Estimated Cost</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              value={editBudget}
              onChangeText={setEditBudget}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Total Cost — Actual</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              value={editTotalCost}
              onChangeText={setEditTotalCost}
              placeholder="0.00"
              keyboardType="decimal-pad"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Contractor / Vendor</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-2"
              value={editContractor}
              onChangeText={setEditContractor}
              placeholder="e.g. ABC Plumbing"
            />
            {vendorNames.length > 0 && (
              <View className="flex-row flex-wrap gap-2 mb-4">
                {vendorNames.map((name) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => setEditContractor(editContractor === name ? "" : name)}
                    className={`px-3 py-1 rounded-full border ${
                      editContractor === name ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-xs font-medium ${editContractor === name ? "text-white" : "text-gray-600"}`}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-1">Notes</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-6 min-h-[100px]"
              value={editNotes}
              onChangeText={setEditNotes}
              multiline
              textAlignVertical="top"
              placeholder="Paint color codes, model numbers, permit info..."
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Checklist Item Modal */}
      <Modal
        visible={addItemChecklist !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setAddItemChecklist(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity
              onPress={() => { setAddItemChecklist(null); setAddItemTitle(""); setAddItemMember(null); setAddItemDate(""); }}
              className="mr-4"
            >
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-base font-semibold text-gray-900">
              Add to "{addItemChecklist}"
            </Text>
            <TouchableOpacity onPress={handleAddChecklistItem} disabled={!addItemTitle.trim() || addTask.isPending}>
              <Text className={`text-base font-semibold ${addItemTitle.trim() ? "text-blue-600" : "text-gray-300"}`}>
                Add
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Text className="text-sm font-medium text-gray-700 mb-1">Task</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              value={addItemTitle}
              onChangeText={setAddItemTitle}
              placeholder="e.g. Get permits"
              autoFocus
              placeholderTextColor="#9ca3af"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign to (optional)</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setAddItemMember(addItemMember === m.id ? null : m.id)}
                  className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full border ${
                    addItemMember === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <MemberAvatar member={m} size="sm" />
                  <Text className={`text-sm font-medium ${addItemMember === m.id ? "text-white" : "text-gray-700"}`}>
                    {m.display_name.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DateInput
              label="Due Date (optional)"
              value={addItemDate}
              onChange={setAddItemDate}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
