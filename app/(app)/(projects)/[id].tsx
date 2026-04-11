import React, { useState, useEffect, useRef } from "react";
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
  useUpdateProjectTask,
  useCompleteProjectChecklistItem,
  useDeleteProjectTask,
} from "@/hooks/useProjectTasks";
import {
  useCompletedChecklistItems,
  useDeleteCompletedChecklistItem,
  useUncompleteChecklistItem,
} from "@/hooks/useChecklistItems";
import { useEventServiceRecords } from "@/hooks/useServices";
import { useQueryClient } from "@tanstack/react-query";
import { usePreferredVendors } from "@/hooks/usePreferredVendors";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { showAlert, showConfirm } from "@/lib/alert";
import { MemberAvatar, MemberAvatarGroup } from "@/components/ui/MemberAvatar";
import { formatDateTime, formatDate, formatDateShort, isOverdue } from "@/utils/dateUtils";
import { centsToDisplay, displayToCents } from "@/utils/currencyUtils";
import { toISODateString } from "@/utils/dateUtils";
import { PROJECT_CATEGORIES } from "@/types/app.types";
import type { ProjectStatus, ProjectPriority, ProjectTask } from "@/types/app.types";

const FREQUENCIES: { label: string; value: string }[] = [
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
  { label: "Bi-Annually", value: "bi-annually" },
  { label: "Annually", value: "annually" },
];

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
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const fromWow = from === "wow";
  const { data: project, isLoading, refetch } = useProject(id);
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const addUpdate = useAddProjectUpdate();
  const editUpdate = useEditProjectUpdate();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const addTask = useAddProjectTask();
  const updateTask = useUpdateProjectTask();
  const completeTask = useCompleteProjectChecklistItem();
  const deleteTask = useDeleteProjectTask();
  const deleteCompleted = useDeleteCompletedChecklistItem();
  const uncompleteItem = useUncompleteChecklistItem();
  const { data: completedItems = [] } = useCompletedChecklistItems("project", id);
  const { data: eventServiceRecords = [] } = useEventServiceRecords("project", id);
  const { data: vendors = [] } = usePreferredVendors(household?.id);
  const qc = useQueryClient();

  const currentMember = members.find((m) => m.user_id === user?.id);

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
  const [addItemNotes, setAddItemNotes] = useState("");
  const [showCompleted, setShowCompleted] = useState(false);

  // Edit checklist item modal
  const [editingItem, setEditingItem] = useState<ProjectTask | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemNotes, setEditItemNotes] = useState("");
  const [editItemDate, setEditItemDate] = useState("");
  const [editItemMember, setEditItemMember] = useState<string | null>(null);
  const [editItemChecklist, setEditItemChecklist] = useState<string>("General");

  // Move-to-checklist modal
  const [movingTask, setMovingTask] = useState<ProjectTask | null>(null);

  // Edit project modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState<ProjectPriority>("medium");
  const [editCategory, setEditCategory] = useState<string | undefined>(undefined);
  const [editDueDate, setEditDueDate] = useState("");
  const [editBudget, setEditBudget] = useState("");
  const [editTotalCost, setEditTotalCost] = useState("");
  const [editUsesVendor, setEditUsesVendor] = useState<boolean | null>(null);
  const [editSelectedVendorId, setEditSelectedVendorId] = useState<string | null>(null);
  const [editOtherVendorName, setEditOtherVendorName] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editFrequency, setEditFrequency] = useState<string | null>(null);

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

  const projEditInitialRef = useRef<string>("");
  const projEditAutoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [projEditSaved, setProjEditSaved] = useState(false);

  // Seed edit modal and capture initial snapshot
  useEffect(() => {
    if (showEditModal && project) {
      setEditTitle(project.title);
      setEditDescription(project.description ?? "");
      setEditPriority(project.priority as ProjectPriority);
      setEditCategory(project.category ?? undefined);
      setEditDueDate(project.expected_date ?? "");
      setEditBudget(project.estimated_cost_cents ? (project.estimated_cost_cents / 100).toFixed(2) : "");
      setEditTotalCost(project.total_cost_cents ? (project.total_cost_cents / 100).toFixed(2) : "");
      setEditUsesVendor((project as any).uses_vendor ?? null);
      const hasOtherVendor = !(project as any).primary_vendor_id && (project as any).contractor_name;
      setEditSelectedVendorId(hasOtherVendor ? "__other__" : ((project as any).primary_vendor_id ?? null));
      setEditOtherVendorName((project as any).contractor_name ?? "");
      setEditNotes(project.notes ?? "");
      setEditFrequency((project as any).frequency ?? null);
      setProjEditSaved(false);
      projEditInitialRef.current = JSON.stringify({ title: project.title, desc: project.description ?? "", priority: project.priority, category: project.category, due: project.expected_date ?? "", notes: project.notes ?? "" });
    }
  }, [showEditModal]);

  const handleAddUpdate = async () => {
    if (!updateText.trim() || !currentMember || !id) return;
    const body = updateText.trim();
    try {
      await addUpdate.mutateAsync({ project_id: id, author_id: currentMember.id, body });
      setUpdateText("");
      setShowUpdateModal(false);

      // @mention notifications — find mentioned members and push-notify them
      const mentionedMembers = members.filter((m) => {
        if (m.id === currentMember.id) return false;
        if (!m.display_name) return false;
        // Match @Name (case-insensitive) or bare name preceded by word boundary
        const escaped = m.display_name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        return new RegExp(`(?:^|[\\s@])${escaped}(?=[\\s,!?.]|$)`, "i").test(body);
      });

      if (mentionedMembers.length > 0) {
        const userIds = mentionedMembers.map((m) => m.user_id).filter(Boolean);
        const { data: tokens } = await supabase
          .from("device_tokens")
          .select("user_id, expo_push_token")
          .in("user_id", userIds);

        if (tokens && tokens.length > 0) {
          const authorName = currentMember.display_name ?? "Someone";
          const projectTitle = project?.title ?? "a project";
          const messages = tokens.map((t) => ({
            to: t.expo_push_token,
            title: `${authorName} mentioned you`,
            body: `In "${projectTitle}": ${body.length > 80 ? body.slice(0, 77) + "…" : body}`,
            data: { screen: "project", projectId: id },
          }));

          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(messages),
          }).catch(() => {
            // Best-effort — don't block the UI on push failure
          });
        }
      }
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
    if (!editTitle.trim() || !id || !household) return;
    const isOtherVendor = editSelectedVendorId === "__other__";
    const totalCents = editTotalCost.trim() ? displayToCents(editTotalCost) : 0;
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
          total_cost_cents: totalCents,
          uses_vendor: editUsesVendor === true,
          primary_vendor_id: editUsesVendor && !isOtherVendor ? editSelectedVendorId : null,
          contractor_name: editUsesVendor && isOtherVendor ? editOtherVendorName.trim() || null : null,
          notes: editNotes.trim() || null,
          frequency: editFrequency,
        },
      });

      // Auto-create preferred vendor when "Other" name is entered
      let resolvedVendorId = isOtherVendor ? null : editSelectedVendorId;
      let resolvedVendorName = isOtherVendor
        ? editOtherVendorName.trim()
        : vendors.find((v) => v.id === editSelectedVendorId)?.name ?? "";

      if (editUsesVendor && isOtherVendor && editOtherVendorName.trim()) {
        const { data: existing } = await supabase
          .from("preferred_vendors")
          .select("id")
          .eq("household_id", household.id)
          .ilike("name", editOtherVendorName.trim())
          .limit(1);
        if (existing && existing.length > 0) {
          resolvedVendorId = existing[0].id;
        } else {
          const { data: newVendor } = await supabase
            .from("preferred_vendors")
            .insert({ household_id: household.id, name: editOtherVendorName.trim() })
            .select("id")
            .single();
          resolvedVendorId = newVendor?.id ?? null;
        }
        if (resolvedVendorId) {
          await supabase
            .from("projects")
            .update({ primary_vendor_id: resolvedVendorId, contractor_name: null })
            .eq("id", id);
        }
      }

      // Auto-create service record if vendor + cost and none linked yet
      if (editUsesVendor && totalCents > 0 && resolvedVendorName && eventServiceRecords.length === 0) {
        await supabase.from("service_records").insert({
          household_id: household.id,
          vendor_name: resolvedVendorName,
          service_type: (project as any).category ?? "Project",
          service_date: editDueDate || toISODateString(new Date()),
          cost_cents: totalCents,
          event_type: "project",
          event_id: id,
          frequency: (editFrequency === "annually" ? "yearly" : editFrequency) as any,
          notes: null,
          receipt_url: null,
        });
      }

      projEditInitialRef.current = JSON.stringify({ title: editTitle, desc: editDescription, priority: editPriority, category: editCategory, due: editDueDate, notes: editNotes });
      setProjEditSaved(true);
      setTimeout(() => setProjEditSaved(false), 2000);
    } catch (e: any) { showAlert("Error", e.message); }
  };

  // Auto-save project edits after 3s of inactivity (core fields only; vendor handled on Done)
  useEffect(() => {
    if (!showEditModal) return;
    const current = JSON.stringify({ title: editTitle, desc: editDescription, priority: editPriority, category: editCategory, due: editDueDate, notes: editNotes });
    if (current === projEditInitialRef.current) return;
    if (projEditAutoSaveRef.current) clearTimeout(projEditAutoSaveRef.current);
    projEditAutoSaveRef.current = setTimeout(() => { handleSaveEditProject(); }, 3000);
    return () => { if (projEditAutoSaveRef.current) clearTimeout(projEditAutoSaveRef.current); };
  }, [editTitle, editDescription, editPriority, editCategory, editDueDate, editNotes, editBudget, editTotalCost, editUsesVendor, editSelectedVendorId, editOtherVendorName, editFrequency]);

  const handleDoneProjectEdit = async () => {
    if (projEditAutoSaveRef.current) {
      clearTimeout(projEditAutoSaveRef.current);
      projEditAutoSaveRef.current = null;
      await handleSaveEditProject();
    }
    setShowEditModal(false);
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
      // Restart service reminder clocks for any linked records with a frequency
      if (newStatus === "finished" || newStatus === "completed") {
        const today = toISODateString(new Date());
        const linked = eventServiceRecords.filter((r) => r.frequency);
        for (const rec of linked) {
          await supabase.from("service_records").update({ service_date: today }).eq("id", rec.id);
        }
        if (linked.length > 0) {
          qc.invalidateQueries({ queryKey: ["service_records"] });
          qc.invalidateQueries({ queryKey: ["service_records_event", "project", id] });
        }
      }
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
    // Immediately open the add-task modal so the checklist is saved via a task
    setAddItemChecklist(name);
  };

  const handleDeleteChecklist = (name: string) => {
    const tasks = tasksByChecklist[name] ?? [];
    showConfirm(
      `Delete "${name}"?`,
      tasks.length > 0
        ? `This will permanently remove ${tasks.length} item${tasks.length === 1 ? "" : "s"}.`
        : "This checklist is empty and will be removed.",
      async () => {
        try {
          for (const task of tasks) {
            await deleteTask.mutateAsync({ id: task.id, project_id: task.project_id });
          }
          setLocalChecklists((prev) => prev.filter((n) => n !== name));
        } catch (e: any) {
          showAlert("Error", e.message);
        }
      },
      true
    );
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
        notes: addItemNotes.trim() || null,
      });
      setAddItemTitle("");
      setAddItemMember(null);
      setAddItemDate("");
      setAddItemNotes("");
      setAddItemChecklist(null);
    } catch (e: any) { showAlert("Error", e.message); }
  };

  const openEditItem = (task: ProjectTask) => {
    setEditingItem(task);
    setEditItemTitle(task.title);
    setEditItemNotes((task as any).notes ?? "");
    setEditItemDate(task.due_date ?? "");
    setEditItemMember(task.assigned_member_id ?? null);
    setEditItemChecklist(task.checklist_name ?? "General");
  };

  const handleSaveEditItem = async () => {
    if (!editingItem || !editItemTitle.trim() || !id) return;
    try {
      await updateTask.mutateAsync({
        id: editingItem.id,
        project_id: editingItem.project_id,
        updates: {
          title: editItemTitle.trim(),
          notes: editItemNotes.trim() || null,
          due_date: editItemDate || null,
          assigned_member_id: editItemMember,
          checklist_name: editItemChecklist,
        },
      });
      setEditingItem(null);
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

  const handleQuickMoveToChecklist = (task: ProjectTask) => {
    const others = checklistNames.filter((n) => n !== (task.checklist_name ?? "General"));
    if (others.length === 0) {
      showAlert("No other checklists", "Add another checklist section first.");
      return;
    }
    setMovingTask(task);
  };

  const handleMoveTask = async (task: ProjectTask, direction: "up" | "down") => {
    const checklistName = task.checklist_name ?? "General";
    const group = (allTasks)
      .filter((t) => (t.checklist_name ?? "General") === checklistName)
      .sort((a, b) => a.sort_order - b.sort_order);
    const idx = group.findIndex((t) => t.id === task.id);
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= group.length) return;
    const swapTask = group[swapIdx];
    try {
      await updateTask.mutateAsync({ id: task.id, project_id: task.project_id, updates: { sort_order: swapTask.sort_order } });
      await updateTask.mutateAsync({ id: swapTask.id, project_id: swapTask.project_id, updates: { sort_order: task.sort_order } });
    } catch (e: any) { showAlert("Error", e.message); }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Text className="text-green-700 text-base">← Back</Text>
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-semibold text-gray-400">Loading…</Text>
        </View>
        <View className="flex-1 items-center justify-center">
          <Text className="text-gray-400 text-sm">Loading project…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!project) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
        <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Text className="text-green-700 text-base">← Back</Text>
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-semibold text-gray-400">Project not found</Text>
        </View>
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-gray-400 text-sm text-center">
            This project could not be loaded. It may have been deleted.
          </Text>
          <TouchableOpacity onPress={() => router.back()} className="mt-4">
            <Text className="text-green-700 text-base">← Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
          <Text className="text-green-700 text-base">← Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900" numberOfLines={1}>
          {project.title}
        </Text>
        {!isFinished && (
          <TouchableOpacity onPress={() => setShowEditModal(true)} className="ml-3">
            <Text className="text-blue-600 text-sm font-medium">Edit</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={handleDelete} className="ml-2">
          <Text className="text-gray-300 text-lg">🗑️</Text>
        </TouchableOpacity>
      </View>
      {fromWow && (
        <View className="flex-row items-center px-4 py-2 gap-4" style={{ backgroundColor: "#FFF8F0" }}>
          <TouchableOpacity onPress={() => router.replace("/(app)/(home)")}>
            <Text className="text-xs font-semibold" style={{ color: "#FC9853" }}>← Dashboard</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/(app)/(projects)")}>
            <Text className="text-xs font-semibold text-blue-500">Projects →</Text>
          </TouchableOpacity>
        </View>
      )}

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

          {/* Frequency + Vendor indicator */}
          {((project as any).frequency || (project as any).uses_vendor) && (
            <View className="flex-row items-center gap-3 py-2 border-t border-gray-100 mt-2 flex-wrap">
              {(project as any).frequency && (
                <Text className="text-xs text-indigo-600 font-medium">
                  🔁 {FREQUENCIES.find((f) => f.value === (project as any).frequency)?.label ?? (project as any).frequency}
                </Text>
              )}
              {(project as any).uses_vendor && (
                <Text className="text-xs text-blue-500 font-medium">Uses a vendor</Text>
              )}
            </View>
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

        {/* Vendor & Service Records */}
        {(project as any).uses_vendor && (() => {
          const linkedVendor = (project as any).primary_vendor_id
            ? vendors.find((v) => v.id === (project as any).primary_vendor_id)
            : null;
          const totalSpent = eventServiceRecords.reduce((sum, r) => sum + (r.cost_cents ?? 0), 0);
          return (
            <Card className="mb-4">
              <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Vendor
              </Text>
              {linkedVendor ? (
                <>
                  <Text className="text-base font-semibold text-gray-900">{linkedVendor.name}</Text>
                  {linkedVendor.category && (
                    <Text className="text-xs text-gray-400 mt-0.5">{linkedVendor.category}</Text>
                  )}
                  {linkedVendor.recommendation && (
                    <Text className="text-sm text-gray-600 mt-2 italic">"{linkedVendor.recommendation}"</Text>
                  )}
                  {linkedVendor.notes && (
                    <Text className="text-sm text-gray-500 mt-1">{linkedVendor.notes}</Text>
                  )}
                </>
              ) : (
                <Text className="text-sm text-gray-400">No vendor linked yet. Edit project to select one.</Text>
              )}

              {eventServiceRecords.length > 0 && (
                <View className="mt-3 pt-3 border-t border-gray-100">
                  <View className="flex-row items-center justify-between mb-2">
                    <Text className="text-xs font-semibold text-gray-500">Service Records</Text>
                    {totalSpent > 0 && (
                      <Text className="text-xs font-semibold text-gray-700">
                        Total: {(totalSpent / 100).toFixed(2)}
                      </Text>
                    )}
                  </View>
                  {eventServiceRecords.map((rec: any) => (
                    <View key={rec.id} className="py-2 border-b border-gray-50">
                      <View className="flex-row items-start justify-between">
                        <Text className="text-sm font-medium text-gray-700 flex-1 mr-2">
                          {rec.service_type ?? rec.vendor_name}
                        </Text>
                        {rec.cost_cents != null && rec.cost_cents > 0 && (
                          <Text className="text-sm font-semibold text-gray-700">
                            ${(rec.cost_cents / 100).toFixed(2)}
                          </Text>
                        )}
                      </View>
                      {rec.service_date && (
                        <Text className="text-xs text-gray-400 mt-0.5">{formatDateShort(rec.service_date)}</Text>
                      )}
                      {rec.notes && (
                        <Text className="text-xs text-gray-500 mt-0.5">{rec.notes}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}
            </Card>
          );
        })()}

        {/* Linked Service Reminders (connected from Home dashboard, no vendor set) */}
        {!(project as any).uses_vendor && eventServiceRecords.length > 0 && (
          <Card className="mb-4">
            <Text className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Linked Service Reminders
            </Text>
            {eventServiceRecords.map((rec) => {
              const freqLabel = rec.frequency === "monthly" ? "Monthly"
                : rec.frequency === "quarterly" ? "Quarterly"
                : rec.frequency === "bi-annually" ? "Bi-Annually"
                : rec.frequency === "yearly" ? "Yearly" : null;
              return (
                <View key={rec.id} className="py-2 border-b border-gray-50 last:border-b-0">
                  <View className="flex-row items-start justify-between">
                    <View className="flex-1 mr-2">
                      <Text className="text-sm font-semibold text-gray-800">{rec.vendor_name}</Text>
                      <Text className="text-xs text-gray-500 mt-0.5">{rec.service_type}</Text>
                    </View>
                    {rec.cost_cents > 0 && (
                      <Text className="text-sm font-semibold text-gray-700">
                        ${(rec.cost_cents / 100).toFixed(2)}
                      </Text>
                    )}
                  </View>
                  <View className="flex-row items-center gap-3 mt-1 flex-wrap">
                    {rec.service_date && (
                      <Text className="text-xs text-gray-400">Last: {formatDateShort(rec.service_date)}</Text>
                    )}
                    {freqLabel && (
                      <Text className="text-xs text-indigo-500 font-medium">🔁 {freqLabel}</Text>
                    )}
                  </View>
                  {rec.notes && (
                    <Text className="text-xs text-gray-500 mt-1">{rec.notes}</Text>
                  )}
                </View>
              );
            })}
            <Text className="text-xs text-gray-400 mt-2">
              Clock resets to today when this project is marked complete.
            </Text>
          </Card>
        )}

        {/* Checklists */}
        {checklistNames.map((name) => (
          <View key={name} className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-sm font-bold text-gray-500 uppercase tracking-wider">{name}</Text>
              {!isFinished && (
                <View className="flex-row items-center gap-2">
                  <TouchableOpacity
                    onPress={() => handleDeleteChecklist(name)}
                    className="w-6 h-6 rounded-full bg-red-50 border border-red-200 items-center justify-center"
                  >
                    <Text className="text-red-400 text-xs font-bold leading-none">×</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setAddItemChecklist(name)}
                    className="bg-blue-600 rounded-full px-3 py-0.5"
                  >
                    <Text className="text-white text-xs font-semibold">+ Add</Text>
                  </TouchableOpacity>
                </View>
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
                  const isOverdueItem = task.due_date ? isOverdue(task.due_date) : false;
                  return (
                    <TouchableOpacity
                      key={task.id}
                      onPress={() => openEditItem(task)}
                      className="flex-row items-center py-1.5 border-b border-gray-50"
                    >
                      <TouchableOpacity
                        onPress={(e) => { e.stopPropagation(); handleCompleteTask(task); }}
                        className="w-4 h-4 rounded-full border-2 border-gray-300 mr-2 items-center justify-center flex-shrink-0"
                      />
                      <View className="flex-1 mr-1">
                        <Text className="text-xs text-gray-800" numberOfLines={1}>{task.title}</Text>
                        <View className="flex-row items-center gap-1.5 flex-wrap">
                          {assignedMember && (
                            <Text className="text-xs text-gray-400">{assignedMember.display_name.split(" ")[0]}</Text>
                          )}
                          {task.due_date && (
                            <Text className={`text-xs ${isOverdueItem ? "text-red-500 font-medium" : "text-gray-400"}`}>
                              {formatDateShort(task.due_date)}{isOverdueItem ? " ·!" : ""}
                            </Text>
                          )}
                        </View>
                      </View>
                      <View className="flex-row items-center gap-0.5">
                        {checklistNames.length > 1 && (
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); handleQuickMoveToChecklist(task); }}
                            className="bg-blue-50 rounded px-1.5 py-1"
                          >
                            <Text className="text-blue-500 text-xs font-medium">Move</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          onPress={(e) => {
                            e.stopPropagation();
                            showConfirm("Remove task?", `"${task.title}"`, () => {
                              deleteTask.mutateAsync({ id: task.id, project_id: task.project_id })
                                .catch((err: any) => showAlert("Error", err.message));
                            }, true);
                          }}
                          className="px-1 py-1"
                        >
                          <Text className="text-gray-300 text-sm leading-none">×</Text>
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
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
                    <TouchableOpacity
                      onPress={() => uncompleteItem.mutate({ item })}
                      className="w-5 h-5 rounded-full bg-green-500 mr-3 items-center justify-center"
                    >
                      <Text className="text-white text-xs font-bold">✓</Text>
                    </TouchableOpacity>
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

      {/* Move to Checklist modal */}
      <Modal visible={!!movingTask} animationType="slide" presentationStyle="formSheet" onRequestClose={() => setMovingTask(null)}>
        <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <Text className="flex-1 text-base font-semibold text-gray-900">Move to Checklist</Text>
            <TouchableOpacity onPress={() => setMovingTask(null)}>
              <Text className="text-blue-600 text-sm font-medium">Cancel</Text>
            </TouchableOpacity>
          </View>
          {movingTask && (
            <>
              <Text className="text-xs text-gray-400 px-4 pt-3 pb-1" numberOfLines={1}>
                "{movingTask.title}"
              </Text>
              {checklistNames
                .filter((n) => n !== (movingTask.checklist_name ?? "General"))
                .map((name) => (
                  <TouchableOpacity
                    key={name}
                    onPress={() => {
                      updateTask
                        .mutateAsync({ id: movingTask.id, project_id: movingTask.project_id, updates: { checklist_name: name } })
                        .then(() => setMovingTask(null))
                        .catch((e: any) => showAlert("Error", e.message));
                    }}
                    className="flex-row items-center justify-between px-4 py-4 bg-white border-b border-gray-100 mx-0"
                  >
                    <Text className="text-base text-gray-900">{name}</Text>
                    <Text className="text-gray-400 text-base">→</Text>
                  </TouchableOpacity>
                ))}
            </>
          )}
        </SafeAreaView>
      </Modal>

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
            <TouchableOpacity onPress={handleDoneProjectEdit}>
              <Text className="text-blue-600 text-base">Done</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-center text-lg font-semibold">Edit Project</Text>
            {projEditSaved
              ? <Text className="text-xs font-semibold text-green-600">Saved ✓</Text>
              : updateProject.isPending
                ? <Text className="text-xs text-gray-400">Saving…</Text>
                : <View style={{ width: 50 }} />}
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

            <Text className="text-sm font-medium text-gray-700 mb-2">Will a Vendor Be Used?</Text>
            <View className="flex-row gap-3 mb-4">
              {(["Yes", "No"] as const).map((opt) => {
                const val = opt === "Yes";
                const active = editUsesVendor === val;
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => {
                      setEditUsesVendor(val);
                      if (!val) setEditSelectedVendorId(null);
                    }}
                    className={`flex-1 py-2.5 rounded-xl border items-center ${
                      active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                      {opt}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {editUsesVendor && (
              <>
                <Text className="text-sm font-medium text-gray-700 mb-2">Select Vendor (optional)</Text>
                <View className="flex-row flex-wrap gap-2 mb-2">
                  {vendors.filter((v) => v.rating === null || (v as any).rating > 2).map((v) => {
                    const active = editSelectedVendorId === v.id;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        onPress={() => { setEditSelectedVendorId(active ? null : v.id); setEditOtherVendorName(""); }}
                        className={`px-3 py-1.5 rounded-full border ${
                          active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                        }`}
                      >
                        <Text className={`text-sm font-medium ${active ? "text-white" : "text-gray-700"}`}>
                          {v.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                  <TouchableOpacity
                    onPress={() => setEditSelectedVendorId(editSelectedVendorId === "__other__" ? null : "__other__")}
                    className={`px-3 py-1.5 rounded-full border ${
                      editSelectedVendorId === "__other__" ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text className={`text-sm font-medium ${editSelectedVendorId === "__other__" ? "text-white" : "text-gray-700"}`}>
                      Other
                    </Text>
                  </TouchableOpacity>
                </View>
                {editSelectedVendorId === "__other__" && (
                  <TextInput
                    className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 mb-4"
                    value={editOtherVendorName}
                    onChangeText={setEditOtherVendorName}
                    placeholder="Enter vendor name..."
                    placeholderTextColor="#9ca3af"
                  />
                )}
                {editSelectedVendorId !== "__other__" && <View className="mb-2" />}
              </>
            )}

            <Text className="text-sm font-medium text-gray-700 mb-2">Frequency (optional)</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {FREQUENCIES.map((f) => (
                <TouchableOpacity
                  key={f.value}
                  onPress={() => setEditFrequency(editFrequency === f.value ? null : f.value)}
                  className={`px-3 py-1.5 rounded-full border ${
                    editFrequency === f.value ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editFrequency === f.value ? "text-white" : "text-gray-700"}`}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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

            <Text className="text-sm font-medium text-gray-700 mb-1">Notes (optional)</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4 min-h-[70px]"
              value={addItemNotes}
              onChangeText={setAddItemNotes}
              placeholder="Add details..."
              multiline
              textAlignVertical="top"
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

      {/* Edit Checklist Item Modal */}
      <Modal
        visible={editingItem !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingItem(null)}
      >
        <SafeAreaView className="flex-1 bg-gray-50">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingItem(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-base font-semibold text-gray-900">Edit Task</Text>
            <TouchableOpacity onPress={handleSaveEditItem} disabled={!editItemTitle.trim() || updateTask.isPending}>
              <Text className={`text-base font-semibold ${editItemTitle.trim() ? "text-blue-600" : "text-gray-300"}`}>
                Save
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Text className="text-sm font-medium text-gray-700 mb-1">Task</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4"
              value={editItemTitle}
              onChangeText={setEditItemTitle}
              autoFocus
              placeholderTextColor="#9ca3af"
            />

            <Text className="text-sm font-medium text-gray-700 mb-1">Notes (optional)</Text>
            <TextInput
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-base text-gray-900 mb-4 min-h-[70px]"
              value={editItemNotes}
              onChangeText={setEditItemNotes}
              placeholder="Add details..."
              multiline
              textAlignVertical="top"
              placeholderTextColor="#9ca3af"
            />

            <Text className="text-sm font-medium text-gray-700 mb-2">Assign to (optional)</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {members.map((m) => (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setEditItemMember(editItemMember === m.id ? null : m.id)}
                  className={`flex-row items-center gap-2 px-3 py-1.5 rounded-full border ${
                    editItemMember === m.id ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                  }`}
                >
                  <MemberAvatar member={m} size="sm" />
                  <Text className={`text-sm font-medium ${editItemMember === m.id ? "text-white" : "text-gray-700"}`}>
                    {m.display_name.split(" ")[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <DateInput
              label="Due Date (optional)"
              value={editItemDate}
              onChange={setEditItemDate}
            />

            <Text className="text-sm font-medium text-gray-700 mb-2 mt-2">Move to Checklist</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {checklistNames.map((n) => (
                <TouchableOpacity
                  key={n}
                  onPress={() => setEditItemChecklist(n)}
                  className={`px-3 py-1.5 rounded-full border ${
                    editItemChecklist === n ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
                  }`}
                >
                  <Text className={`text-sm font-medium ${editItemChecklist === n ? "text-white" : "text-gray-700"}`}>
                    {n}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={() => {
                if (!editingItem) return;
                showConfirm("Remove task?", editingItem.title, () => {
                  deleteTask.mutate({ id: editingItem.id, project_id: editingItem.project_id });
                  setEditingItem(null);
                }, true);
              }}
              className="mt-2 items-center py-3"
            >
              <Text className="text-red-500 font-medium">Delete Task</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
