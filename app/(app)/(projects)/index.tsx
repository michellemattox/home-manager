import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  ScrollView,
  Modal,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { getYear, parseISO } from "date-fns";
import * as Linking from "expo-linking";
import { useHouseholdStore } from "@/stores/householdStore";
import { useProjects } from "@/hooks/useProjects";
import { useServiceRecords, useUpdateServiceRecord, useDeleteServiceRecord } from "@/hooks/useServices";
import { usePreferredVendors, useAddPreferredVendor, useUpdatePreferredVendor, useDeletePreferredVendor } from "@/hooks/usePreferredVendors";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SpendChart } from "@/components/ui/SpendChart";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DateInput } from "@/components/ui/DateInput";
import { MemberAvatarGroup } from "@/components/ui/MemberAvatar";
import { showAlert, showConfirm } from "@/lib/alert";
import { buildGoogleMapsUrl, buildYelpUrl, getServiceTypeKeyword } from "@/lib/vendorLinks";
import { formatDate, formatDateTime, isOverdue, isDueSoon } from "@/utils/dateUtils";
import { centsToDisplay, displayToCents } from "@/utils/currencyUtils";
import { SERVICE_TYPES } from "@/types/app.types";
import { AppHeader } from "@/components/ui/AppHeader";
import type {
  ProjectWithOwners,
  ProjectStatus,
  ProjectPriority,
  ServiceRecord,
  PreferredVendor,
  ServiceType,
} from "@/types/app.types";

// ── Projects sub-tab ──────────────────────────────────────────────────────────

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
type DueFilter = "overdue" | "due_soon" | null;

function ProjectCard({ project }: { project: ProjectWithOwners }) {
  const router = useRouter();
  const { members } = useHouseholdStore();
  const owners = (project.project_owners ?? [])
    .map((po) => members.find((m) => m.id === po.member_id))
    .filter(Boolean) as any[];
  const latestUpdate = [...(project.project_updates ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0];
  const updateAuthor = latestUpdate ? members.find((m) => m.id === latestUpdate.author_id) : null;
  const sc = STATUS_CONFIG[project.status];
  const pc = PRIORITY_CONFIG[project.priority];
  const overdue = project.expected_date && isOverdue(project.expected_date);
  const dueSoon = project.expected_date && !overdue && isDueSoon(project.expected_date);

  return (
    <TouchableOpacity onPress={() => router.push(`/(app)/(projects)/${project.id}`)}>
      <Card className="mb-3">
        <View className="flex-row items-start justify-between mb-2">
          <Text className="text-base font-semibold text-gray-900 flex-1 mr-2" numberOfLines={2}>
            {project.title}
          </Text>
          <View className="items-end">
            <MemberAvatarGroup members={owners} />
            {owners.length > 0 && (
              <Text className="text-xs text-gray-500 mt-1">
                {owners.length > 1 ? "All" : owners[0]?.display_name ?? ""}
              </Text>
            )}
          </View>
        </View>
        <View className="flex-row gap-2 flex-wrap mb-2">
          <Badge label={sc.label} variant={sc.variant} size="sm" />
          <Badge label={pc.label} variant={pc.variant} size="sm" />
          {project.category && <Badge label={project.category} variant="default" size="sm" />}
          {overdue && <Badge label="Overdue" variant="danger" size="sm" />}
          {dueSoon && <Badge label="Due Soon" variant="warning" size="sm" />}
          {project.expected_date && !overdue && !dueSoon && (
            <Badge label={`Due ${formatDate(project.expected_date)}`} variant="default" size="sm" />
          )}
          {project.estimated_cost_cents > 0 && (
            <Badge label={centsToDisplay(project.estimated_cost_cents, true)} variant="default" size="sm" />
          )}
        </View>
        {latestUpdate ? (
          <View className="mt-1 pt-2 border-t border-gray-100">
            <Text className="text-xs text-gray-400 mb-0.5">
              {formatDateTime(latestUpdate.created_at)}
              {updateAuthor ? ` · ${updateAuthor.display_name}` : ""}
            </Text>
            <Text className="text-sm text-gray-600" numberOfLines={2}>{latestUpdate.body}</Text>
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

function ProjectsTab() {
  const router = useRouter();
  const { household, members } = useHouseholdStore();
  const { data: projects, isLoading, refetch } = useProjects(household?.id);
  const [showFinished, setShowFinished] = useState(false);
  const [filterPriority, setFilterPriority] = useState<ProjectPriority | null>(null);
  const [filterDue, setFilterDue] = useState<DueFilter>(null);
  const [filterOwner, setFilterOwner] = useState<string | null>(null);

  const openCount = (projects ?? []).filter((p) => OPEN_STATUSES.includes(p.status as ProjectStatus)).length;
  const finishedCount = (projects ?? []).filter((p) => p.status === "finished" || p.status === "completed").length;
  const overdueCount = (projects ?? []).filter(
    (p) => OPEN_STATUSES.includes(p.status as ProjectStatus) && p.expected_date && isOverdue(p.expected_date)
  ).length;

  const filtered = useMemo(() => {
    if (!projects) return [];
    let list = projects.filter((p) =>
      showFinished
        ? p.status === "finished" || p.status === "completed"
        : OPEN_STATUSES.includes(p.status as ProjectStatus)
    );
    if (filterPriority) list = list.filter((p) => p.priority === filterPriority);
    if (filterDue === "overdue") list = list.filter((p) => p.expected_date && isOverdue(p.expected_date));
    else if (filterDue === "due_soon") list = list.filter((p) => p.expected_date && isDueSoon(p.expected_date));
    if (filterOwner) list = list.filter((p) =>
      (p.project_owners ?? []).some((po: any) => po.member_id === filterOwner)
    );
    return [...list].sort((a, b) => {
      if (!a.expected_date && !b.expected_date) return 0;
      if (!a.expected_date) return 1;
      if (!b.expected_date) return -1;
      return new Date(a.expected_date).getTime() - new Date(b.expected_date).getTime();
    });
  }, [projects, showFinished, filterPriority, filterDue, filterOwner]);

  return (
    <>
      {/* Action row */}
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row gap-3">
          {openCount > 0 && <Text className="text-xs text-gray-400">{openCount} open</Text>}
          {overdueCount > 0 && <Text className="text-xs text-red-500 font-medium">{overdueCount} overdue</Text>}
        </View>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(projects)/new")}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      {/* Filter panel */}
      <View className="px-4 pt-2 pb-3">
        {/* Status row */}
        <View className="flex-row items-center mb-2">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide" style={{ width: 60 }}>Status</Text>
          <View className="flex-row flex-wrap gap-2">
            <TouchableOpacity
              onPress={() => setShowFinished(false)}
              className={`px-3 py-1 rounded-full border ${!showFinished ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
            >
              <Text className={`text-xs font-semibold ${!showFinished ? "text-white" : "text-gray-600"}`}>
                Open{openCount > 0 ? ` (${openCount})` : ""}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowFinished(true)}
              className={`px-3 py-1 rounded-full border ${showFinished ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
            >
              <Text className={`text-xs font-semibold ${showFinished ? "text-white" : "text-gray-600"}`}>
                Finished{finishedCount > 0 ? ` (${finishedCount})` : ""}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {!showFinished && (
          <>
            {/* Due date row */}
            <View className="flex-row items-center mb-2">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide" style={{ width: 60 }}>Due</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setFilterDue(null)}
                  className={`px-3 py-1 rounded-full border ${filterDue === null ? "bg-gray-700 border-gray-700" : "bg-white border-gray-300"}`}
                >
                  <Text className={`text-xs font-semibold ${filterDue === null ? "text-white" : "text-gray-600"}`}>All</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterDue(filterDue === "overdue" ? null : "overdue")}
                  className={`px-3 py-1 rounded-full border ${filterDue === "overdue" ? "bg-red-500 border-red-500" : "bg-white border-gray-300"}`}
                >
                  <Text className={`text-xs font-semibold ${filterDue === "overdue" ? "text-white" : "text-gray-600"}`}>Overdue</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setFilterDue(filterDue === "due_soon" ? null : "due_soon")}
                  className={`px-3 py-1 rounded-full border ${filterDue === "due_soon" ? "bg-amber-500 border-amber-500" : "bg-white border-gray-300"}`}
                >
                  <Text className={`text-xs font-semibold ${filterDue === "due_soon" ? "text-white" : "text-gray-600"}`}>Due Soon</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Priority row */}
            <View className="flex-row items-center mb-2">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide" style={{ width: 60 }}>Priority</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setFilterPriority(null)}
                  className={`px-3 py-1 rounded-full border ${filterPriority === null ? "bg-gray-700 border-gray-700" : "bg-white border-gray-300"}`}
                >
                  <Text className={`text-xs font-semibold ${filterPriority === null ? "text-white" : "text-gray-600"}`}>All</Text>
                </TouchableOpacity>
                {(["high", "medium", "low"] as ProjectPriority[]).map((p) => {
                  const active = filterPriority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      onPress={() => setFilterPriority(active ? null : p)}
                      className={`px-3 py-1 rounded-full border ${active ? (p === "high" ? "bg-red-500 border-red-500" : p === "medium" ? "bg-amber-500 border-amber-500" : "bg-gray-500 border-gray-500") : "bg-white border-gray-300"}`}
                    >
                      <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-600"}`}>
                        {p.charAt(0).toUpperCase() + p.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Assign To row */}
            <View className="flex-row items-center">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide" style={{ width: 60 }}>Assign To</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setFilterOwner(null)}
                  className={`px-3 py-1 rounded-full border ${filterOwner === null ? "bg-gray-700 border-gray-700" : "bg-white border-gray-300"}`}
                >
                  <Text className={`text-xs font-semibold ${filterOwner === null ? "text-white" : "text-gray-600"}`}>All</Text>
                </TouchableOpacity>
                {members.map((m) => {
                  const active = filterOwner === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      onPress={() => setFilterOwner(active ? null : m.id)}
                      className={`px-3 py-1 rounded-full border ${active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}
                    >
                      <Text className={`text-xs font-semibold ${active ? "text-white" : "text-gray-600"}`}>{m.display_name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        contentContainerClassName="px-4 pt-3 pb-8"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => <ProjectCard project={item} />}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title={showFinished ? "No finished projects" : "No open projects"}
              subtitle={showFinished ? "Projects marked Finished appear here." : "Add a project to start tracking."}
              actionLabel={showFinished ? undefined : "Add Project"}
              onAction={showFinished ? undefined : () => router.push("/(app)/(projects)/new")}
              icon="🏗️"
            />
          ) : null
        }
      />
    </>
  );
}

// ── Services sub-tab ──────────────────────────────────────────────────────────

function ServiceRow({ record, onEdit, onDelete }: { record: ServiceRecord; onEdit: () => void; onDelete: () => void }) {
  return (
    <TouchableOpacity onPress={onEdit}>
      <Card className="mb-2">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <Text className="text-base font-semibold text-gray-900">{record.vendor_name}</Text>
            <Text className="text-sm text-gray-500">{record.service_type}</Text>
            <Text className="text-xs text-gray-400 mt-0.5">{formatDate(record.service_date)}</Text>
            {record.notes && (
              <Text className="text-sm text-gray-400 mt-1" numberOfLines={2}>{record.notes}</Text>
            )}
          </View>
          <View className="items-end gap-2">
            <Text className="text-base font-semibold text-gray-800">{centsToDisplay(record.cost_cents)}</Text>
            <TouchableOpacity onPress={onDelete}>
              <Text className="text-gray-300 text-lg">🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

function ServicesTab({ onGoToVendors }: { onGoToVendors: () => void }) {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const { data: records, isLoading, refetch } = useServiceRecords(household?.id);
  const updateRecord = useUpdateServiceRecord();
  const deleteRecord = useDeleteServiceRecord();
  const [showChart, setShowChart] = useState(true);
  const [vendorFilter, setVendorFilter] = useState<string | null>(null);
  const [editingRecord, setEditingRecord] = useState<ServiceRecord | null>(null);
  const [editVendor, setEditVendor] = useState("");
  const [editServiceType, setEditServiceType] = useState("Other");
  const [editDate, setEditDate] = useState("");
  const [editCost, setEditCost] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const openEdit = (record: ServiceRecord) => {
    setEditingRecord(record);
    setEditVendor(record.vendor_name);
    setEditServiceType(record.service_type);
    setEditDate(record.service_date);
    setEditCost((record.cost_cents / 100).toFixed(2));
    setEditNotes(record.notes ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editingRecord || !editVendor.trim()) return;
    try {
      await updateRecord.mutateAsync({
        id: editingRecord.id,
        householdId: editingRecord.household_id,
        updates: {
          vendor_name: editVendor.trim(),
          service_type: editServiceType,
          service_date: editDate,
          cost_cents: displayToCents(editCost),
          notes: editNotes.trim() || null,
        },
      });
      setEditingRecord(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const sections = useMemo(() => {
    if (!records?.length) return [];
    const filtered = vendorFilter ? records.filter((r) => r.vendor_name === vendorFilter) : records;
    const byYear: Record<number, ServiceRecord[]> = {};
    filtered.forEach((r) => {
      const year = getYear(parseISO(r.service_date));
      if (!byYear[year]) byYear[year] = [];
      byYear[year].push(r);
    });
    return Object.entries(byYear)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, items]) => ({ title: String(year), total: items.reduce((s, r) => s + r.cost_cents, 0), data: items }));
  }, [records, vendorFilter]);

  const filteredRecords = vendorFilter ? (records ?? []).filter((r) => r.vendor_name === vendorFilter) : (records ?? []);
  const totalAllTime = filteredRecords.reduce((s, r) => s + r.cost_cents, 0);

  return (
    <>
      <View className="flex-row items-center justify-between px-4 py-2">
        <Text className="text-xs text-gray-400">{filteredRecords.length} records</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(services)/new")}
          className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center"
        >
          <Text className="text-white text-xl font-light">+</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={onGoToVendors}
        className="flex-row items-center justify-between mx-4 mb-3 px-4 py-3 bg-white border border-gray-100 rounded-xl"
      >
        <View className="flex-row items-center gap-3">
          <Text className="text-lg">⭐</Text>
          <View>
            <Text className="text-sm font-semibold text-gray-900">Vendors</Text>
            <Text className="text-xs text-gray-400">Manage preferred vendors &amp; find new ones</Text>
          </View>
        </View>
        <Text className="text-gray-300 text-base">›</Text>
      </TouchableOpacity>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        ListHeaderComponent={
          records && records.length > 0 ? (
            <View className="mb-4">
              {vendorFilter && (
                <TouchableOpacity
                  onPress={() => setVendorFilter(null)}
                  className="flex-row items-center self-start bg-blue-100 border border-blue-300 rounded-full px-3 py-1.5 mb-3"
                >
                  <Text className="text-sm text-blue-700 font-medium mr-2">Showing: {vendorFilter}</Text>
                  <Text className="text-blue-500 font-bold">✕</Text>
                </TouchableOpacity>
              )}
              <View className="flex-row mb-3">
                <Card className="flex-1 mr-2 items-center">
                  <Text className="text-xs text-gray-400 mb-1">All-time</Text>
                  <Text className="text-lg font-bold text-gray-900">{centsToDisplay(totalAllTime)}</Text>
                </Card>
                <Card className="flex-1 items-center">
                  <Text className="text-xs text-gray-400 mb-1">Records</Text>
                  <Text className="text-lg font-bold text-gray-900">{filteredRecords.length}</Text>
                </Card>
              </View>
              <Card>
                <TouchableOpacity
                  onPress={() => setShowChart((v) => !v)}
                  className="flex-row items-center justify-between mb-2"
                >
                  <Text className="text-sm font-semibold text-gray-700">Monthly Spend (12 mo)</Text>
                  <Text className="text-xs text-blue-500">{showChart ? "Hide" : "Show"}</Text>
                </TouchableOpacity>
                {showChart && <SpendChart records={filteredRecords} />}
              </Card>
            </View>
          ) : null
        }
        renderSectionHeader={({ section }) => (
          <View className="flex-row items-center justify-between py-2 bg-[#EBFAFC]">
            <Text className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{section.title}</Text>
            <Text className="text-sm font-semibold text-gray-600">{centsToDisplay(section.total)}</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <ServiceRow record={item} onEdit={() => openEdit(item)} onDelete={() => showConfirm(
            "Delete record?",
            `Remove ${item.vendor_name} — ${centsToDisplay(item.cost_cents)}?`,
            () => deleteRecord.mutate({ id: item.id, householdId: item.household_id }),
            true
          )} />
        )}
        ListEmptyComponent={
          !isLoading ? (
            <EmptyState
              title="No service records"
              subtitle="Track contractor visits and home service costs."
              actionLabel="Add Record"
              onAction={() => router.push("/(app)/(services)/new")}
              icon="🔧"
            />
          ) : null
        }
      />

      <Modal visible={!!editingRecord} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditingRecord(null)}>
        <SafeAreaView className="flex-1 bg-[#EBFAFC]">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingRecord(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Record</Text>
            <TouchableOpacity onPress={handleSaveEdit}>
              <Text className="text-blue-600 text-base font-semibold">Save</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Input label="Vendor / Company Name" value={editVendor} onChangeText={setEditVendor} placeholder="e.g. ABC Plumbing" />
            <Text className="text-sm font-medium text-gray-700 mb-2">Service Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {SERVICE_TYPES.map((type) => (
                <TouchableOpacity
                  key={type}
                  onPress={() => setEditServiceType(type)}
                  className={`mr-2 px-3 py-1.5 rounded-full border ${editServiceType === type ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}
                >
                  <Text className={`text-sm font-medium ${editServiceType === type ? "text-white" : "text-gray-700"}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <DateInput label="Service Date" value={editDate} onChange={setEditDate} />
            <Input label="Total Cost" value={editCost} onChangeText={setEditCost} keyboardType="decimal-pad" placeholder="125.00" />
            <Input label="Notes (optional)" value={editNotes} onChangeText={setEditNotes} multiline numberOfLines={3} placeholder="What was repaired, warranty info..." />
            <Button title="Save Changes" onPress={handleSaveEdit} loading={updateRecord.isPending} />
            <TouchableOpacity
              onPress={() => {
                if (!editingRecord) return;
                showConfirm("Delete record?", `Remove ${editingRecord.vendor_name}?`, () => {
                  deleteRecord.mutate({ id: editingRecord.id, householdId: editingRecord.household_id });
                  setEditingRecord(null);
                }, true);
              }}
              className="mt-3 items-center py-3"
            >
              <Text className="text-red-500 font-medium">Delete Record</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ── Vendors sub-tab ───────────────────────────────────────────────────────────

function StarRating({ rating, onRate, size = "md" }: { rating: number | null; onRate?: (r: number) => void; size?: "sm" | "md" }) {
  const filled = rating ?? 0;
  const sz = size === "sm" ? 14 : 18;
  return (
    <View className="flex-row gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onRate?.(n)} disabled={!onRate} hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
          <Text style={{ fontSize: sz, color: n <= filled ? "#F59E0B" : "#D1D5DB" }}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function VendorCard({ vendor, lastService, onEdit }: { vendor: PreferredVendor; lastService?: ServiceRecord; onEdit: () => void }) {
  const isDNU = (vendor.rating ?? 5) <= 2;
  return (
    <Card className={`mb-3 ${isDNU ? "opacity-60" : ""}`}>
      <View className="flex-row items-start justify-between">
        <View className="flex-1 mr-2">
          <Text className="text-base font-semibold text-gray-900">{vendor.name}</Text>
          {vendor.service_type && <Text className="text-sm text-gray-500 mt-0.5">{vendor.service_type}</Text>}
          {vendor.phone && <Text className="text-xs text-blue-600 mt-0.5">{vendor.phone}</Text>}
          {vendor.notes && <Text className="text-xs text-gray-400 mt-1" numberOfLines={2}>{vendor.notes}</Text>}
          <View className="mt-1.5">
            <StarRating rating={vendor.rating ?? null} size="sm" />
          </View>
          {lastService && (
            <View className="mt-2 pt-2 border-t border-gray-100">
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">Last Service</Text>
              <Text className="text-xs text-gray-600">
                {formatDate(lastService.service_date)} · {centsToDisplay(lastService.cost_cents)}
              </Text>
              {lastService.notes && (
                <Text className="text-xs text-gray-400 mt-0.5" numberOfLines={1}>{lastService.notes}</Text>
              )}
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onEdit} className="p-1">
          <Text className="text-gray-400">✏️</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function VendorsTab({ onBack }: { onBack: () => void }) {
  const { household } = useHouseholdStore();
  const [findTab, setFindTab] = useState<"my" | "find">("my");
  const [selectedType, setSelectedType] = useState<ServiceType | null>(null);
  const { data: preferredVendors, isLoading, refetch } = usePreferredVendors(household?.id);
  const { data: serviceRecords } = useServiceRecords(household?.id);
  const addVendor = useAddPreferredVendor();
  const updateVendor = useUpdatePreferredVendor();
  const deleteVendor = useDeletePreferredVendor();
  const [showModal, setShowModal] = useState(false);
  const [editingVendor, setEditingVendor] = useState<PreferredVendor | null>(null);
  const [modalName, setModalName] = useState("");
  const [modalServiceType, setModalServiceType] = useState("Other");
  const [modalPhone, setModalPhone] = useState("");
  const [modalNotes, setModalNotes] = useState("");
  const [modalRating, setModalRating] = useState<number | null>(null);

  const openAdd = (prefillName?: string, prefillType?: string) => {
    setEditingVendor(null);
    setModalName(prefillName ?? "");
    setModalServiceType(prefillType ?? "Other");
    setModalPhone("");
    setModalNotes("");
    setModalRating(null);
    setShowModal(true);
  };
  const openEdit = (vendor: PreferredVendor) => {
    setEditingVendor(vendor);
    setModalName(vendor.name);
    setModalServiceType(vendor.service_type ?? "Other");
    setModalPhone(vendor.phone ?? "");
    setModalNotes(vendor.notes ?? "");
    setModalRating(vendor.rating ?? null);
    setShowModal(true);
  };
  const handleSave = async () => {
    if (!modalName.trim() || !household) return;
    try {
      if (editingVendor) {
        await updateVendor.mutateAsync({ id: editingVendor.id, householdId: household.id, updates: { name: modalName.trim(), service_type: modalServiceType || null, phone: modalPhone.trim() || null, notes: modalNotes.trim() || null, rating: modalRating } });
      } else {
        await addVendor.mutateAsync({ household_id: household.id, name: modalName.trim(), service_type: modalServiceType || null, phone: modalPhone.trim() || null, notes: modalNotes.trim() || null, rating: modalRating });
      }
      setShowModal(false);
    } catch (e: any) { showAlert("Error", e.message); }
  };
  const handleDelete = () => {
    if (!editingVendor || !household) return;
    showConfirm("Remove vendor?", `Remove "${editingVendor.name}"?`, async () => {
      try {
        await deleteVendor.mutateAsync({ id: editingVendor.id, householdId: household.id });
        setShowModal(false);
      } catch (e: any) { showAlert("Error", e.message); }
    }, true);
  };

  const lastServiceByVendor = useMemo(() => {
    const map: Record<string, ServiceRecord> = {};
    (serviceRecords ?? []).forEach((r) => {
      const key = r.vendor_name.toLowerCase();
      if (!map[key] || r.service_date > map[key].service_date) map[key] = r;
    });
    return map;
  }, [serviceRecords]);

  const preferredNames = new Set((preferredVendors ?? []).map((v) => v.name.toLowerCase()));
  const historyVendors = useMemo(() => {
    const map: Record<string, string> = {};
    (serviceRecords ?? []).forEach((r) => {
      if (!preferredNames.has(r.vendor_name.toLowerCase())) map[r.vendor_name] = r.service_type;
    });
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [serviceRecords, preferredVendors]);

  const zipCode = household?.zip_code ?? "";
  const handleOpen = (url: string) => {
    if (!zipCode) { showAlert("No ZIP Code", "Add your ZIP code in Settings to search nearby vendors."); return; }
    Linking.openURL(url).catch(() => showAlert("Error", "Could not open link"));
  };

  return (
    <>
      <View className="flex-row items-center justify-between px-4 py-2">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={onBack}>
            <Text className="text-blue-600 text-sm font-medium">← Services</Text>
          </TouchableOpacity>
          <Text className="text-xs text-gray-400">{(preferredVendors ?? []).length} vendors</Text>
        </View>
        {findTab === "my" && (
          <TouchableOpacity onPress={() => openAdd()} className="bg-blue-600 rounded-full w-9 h-9 items-center justify-center">
            <Text className="text-white text-xl font-light">+</Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row mx-4 mb-3 bg-gray-200 rounded-xl p-1">
        {(["my", "find"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setFindTab(tab)}
            className={`flex-1 py-2 rounded-lg items-center ${findTab === tab ? "bg-white" : ""}`}
          >
            <Text className={`text-sm font-semibold ${findTab === tab ? "text-gray-900" : "text-gray-500"}`}>
              {tab === "my" ? "My Vendors" : "Find New"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {findTab === "my" ? (
        <ScrollView contentContainerClassName="px-4 pb-8" refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}>
          {(preferredVendors ?? []).length === 0 && !isLoading ? (
            <EmptyState title="No preferred vendors yet" subtitle="Add vendors you trust for quick access." actionLabel="Add Vendor" onAction={() => openAdd()} icon="⭐" />
          ) : (() => {
            const active = (preferredVendors ?? []).filter((v) => v.rating === null || v.rating > 2);
            const dnu = (preferredVendors ?? []).filter((v) => v.rating !== null && v.rating <= 2);
            return (
              <>
                {active.map((v) => (
                  <VendorCard key={v.id} vendor={v} lastService={lastServiceByVendor[v.name.toLowerCase()]} onEdit={() => openEdit(v)} />
                ))}
                {dnu.length > 0 && (
                  <>
                    <View className="flex-row items-center gap-2 mt-4 mb-2">
                      <Text className="text-xs font-semibold text-red-400 uppercase tracking-wider">Do Not Use Again</Text>
                      <View className="flex-1 h-px bg-red-100" />
                    </View>
                    {dnu.map((v) => (
                      <VendorCard key={v.id} vendor={v} lastService={lastServiceByVendor[v.name.toLowerCase()]} onEdit={() => openEdit(v)} />
                    ))}
                  </>
                )}
              </>
            );
          })()}
          {historyVendors.length > 0 && (
            <>
              <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-4 mb-2">From Service History</Text>
              {historyVendors.map(([name, serviceType]) => (
                <View key={name} className="flex-row items-center bg-white border border-gray-100 rounded-xl px-3 py-2.5 mb-2">
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900">{name}</Text>
                    <Text className="text-xs text-gray-500">{serviceType}</Text>
                  </View>
                  <TouchableOpacity onPress={() => openAdd(name, serviceType)} className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5">
                    <Text className="text-blue-700 text-xs font-semibold">+ Add</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView contentContainerClassName="px-4 pb-8">
          <Text className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Select Service Type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {SERVICE_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                onPress={() => setSelectedType(type)}
                className={`mr-2 px-4 py-2 rounded-xl border ${selectedType === type ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}
              >
                <Text className={`font-medium text-sm ${selectedType === type ? "text-white" : "text-gray-700"}`}>{type}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {selectedType ? (
            <>
              <Text className="text-sm font-semibold text-gray-500 mb-3">Search for: {getServiceTypeKeyword(selectedType)}</Text>
              <TouchableOpacity onPress={() => handleOpen(buildGoogleMapsUrl(getServiceTypeKeyword(selectedType), zipCode))}>
                <Card className="mb-3 flex-row items-center">
                  <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mr-3"><Text className="text-xl">🗺️</Text></View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">Open in Google Maps</Text>
                    <Text className="text-sm text-gray-400">Search nearby {selectedType.toLowerCase()} services</Text>
                  </View>
                  <Text className="text-gray-300">›</Text>
                </Card>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleOpen(buildYelpUrl(getServiceTypeKeyword(selectedType), zipCode))}>
                <Card className="flex-row items-center">
                  <View className="w-10 h-10 bg-red-50 rounded-xl items-center justify-center mr-3"><Text className="text-xl">⭐</Text></View>
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-900">Search on Yelp</Text>
                    <Text className="text-sm text-gray-400">Find rated {selectedType.toLowerCase()} contractors</Text>
                  </View>
                  <Text className="text-gray-300">›</Text>
                </Card>
              </TouchableOpacity>
            </>
          ) : (
            <View className="items-center py-12">
              <Text className="text-4xl mb-3">🔍</Text>
              <Text className="text-gray-400 text-center">Pick a service type above to find local vendors</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <SafeAreaView className="flex-1 bg-[#EBFAFC]">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setShowModal(false)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">{editingVendor ? "Edit Vendor" : "Add Vendor"}</Text>
            <TouchableOpacity onPress={handleSave}><Text className="text-blue-600 text-base font-semibold">Save</Text></TouchableOpacity>
          </View>
          <ScrollView contentContainerClassName="px-4 py-4" keyboardShouldPersistTaps="handled">
            <Input label="Vendor Name" value={modalName} onChangeText={setModalName} placeholder="e.g. ABC Plumbing" />
            <Text className="text-sm font-medium text-gray-700 mb-2">Service Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
              {SERVICE_TYPES.map((type) => (
                <TouchableOpacity key={type} onPress={() => setModalServiceType(type)} className={`mr-2 px-3 py-1.5 rounded-full border ${modalServiceType === type ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"}`}>
                  <Text className={`text-sm font-medium ${modalServiceType === type ? "text-white" : "text-gray-700"}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <Input label="Phone (optional)" value={modalPhone} onChangeText={setModalPhone} placeholder="(555) 555-5555" keyboardType="phone-pad" />
            <Input label="Notes (optional)" value={modalNotes} onChangeText={setModalNotes} multiline numberOfLines={3} placeholder="License #, website, contact name..." />
            <View className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-2">Likelihood to Use Again</Text>
              <View className="flex-row items-center gap-3">
                <StarRating rating={modalRating} onRate={setModalRating} />
                {modalRating !== null && (
                  <TouchableOpacity onPress={() => setModalRating(null)}>
                    <Text className="text-xs text-gray-400 underline">Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              {modalRating !== null && modalRating <= 2 && (
                <Text className="text-xs text-red-500 mt-1">⚠ This vendor will be moved to "Do Not Use Again"</Text>
              )}
            </View>
            <Button title={editingVendor ? "Save Changes" : "Add Vendor"} onPress={handleSave} loading={addVendor.isPending || updateVendor.isPending} />
            {editingVendor && (
              <TouchableOpacity onPress={handleDelete} className="mt-3 items-center py-3">
                <Text className="text-red-500 font-medium">Remove Vendor</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

// ── Root screen with sub-tab switcher ─────────────────────────────────────────

type SubTab = "projects" | "services" | "vendors";

export default function ProjectsScreen() {
  const [subTab, setSubTab] = useState<SubTab>("projects");

  return (
    <SafeAreaView className="flex-1 bg-[#EBFAFC]" edges={["top"]}>
      {/* Header */}
      <AppHeader compact />
      <View className="px-4 pt-3 pb-2">
        <Text className="text-xl font-bold text-gray-900 mb-3">Projects</Text>
        {/* Sub-tab switcher */}
        <View className="flex-row bg-gray-100 rounded-xl p-1">
          {(["projects", "services"] as SubTab[]).map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setSubTab(tab)}
              className={`flex-1 py-2 rounded-lg items-center ${subTab === tab || (tab === "services" && subTab === "vendors") ? "bg-white shadow-sm" : ""}`}
            >
              <Text className={`text-sm font-semibold ${subTab === tab || (tab === "services" && subTab === "vendors") ? "text-gray-900" : "text-gray-500"}`}>
                {tab === "projects" ? "Projects" : "Services"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {subTab === "projects" && <ProjectsTab />}
      {subTab === "services" && <ServicesTab onGoToVendors={() => setSubTab("vendors")} />}
      {subTab === "vendors" && <VendorsTab onBack={() => setSubTab("services")} />}
    </SafeAreaView>
  );
}
