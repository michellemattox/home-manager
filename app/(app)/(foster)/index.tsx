import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAppRefresh } from "@/hooks/useAppRefresh";
import {
  useFosterPuppies,
  useCreateFosterPuppy,
  useUpdateFosterPuppy,
  useSetCurrentPuppy,
  useDeactivateFosterPuppy,
  useReactivateFosterPuppy,
  useDeleteFosterPuppy,
} from "@/hooks/useFosterPuppy";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { AppHeader } from "@/components/ui/AppHeader";
import { PuppyLogModal } from "@/components/foster/PuppyLogModal";
import { showAlert, showConfirm } from "@/lib/alert";
import { formatDateSlash, getTodayPT } from "@/utils/dateUtils";
import { computeAge } from "@/utils/puppyPredict";
import { HANDOFF_FIELDS, type FosterPuppy } from "@/types/app.types";

export default function FosterPuppyScreen() {
  const household = useHouseholdStore((s) => s.household);
  const { refreshing, onRefresh } = useAppRefresh();

  const { data: puppies = [], isLoading } = useFosterPuppies(household?.id);
  const createPuppy = useCreateFosterPuppy();
  const updatePuppy = useUpdateFosterPuppy();
  const setCurrent = useSetCurrentPuppy();
  const deactivate = useDeactivateFosterPuppy();
  const reactivate = useReactivateFosterPuppy();
  const deletePuppy = useDeleteFosterPuppy();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FosterPuppy | null>(null);
  const [logFor, setLogFor] = useState<FosterPuppy | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [dobEstimate, setDobEstimate] = useState(false);
  const [arrival, setArrival] = useState(getTodayPT());
  // Keyed by HANDOFF_FIELDS.key (includes the general "notes" field), so the
  // form and the printed report card stay driven by the same list.
  const [handoff, setHandoff] = useState<Record<string, string>>({});
  const setField = (key: string, v: string) =>
    setHandoff((prev) => ({ ...prev, [key]: v }));

  const active = useMemo(() => puppies.filter((p) => p.active), [puppies]);
  const departed = useMemo(() => puppies.filter((p) => !p.active), [puppies]);
  const current = active.find((p) => p.is_current) ?? null;

  const openNew = () => {
    setEditing(null);
    setName("");
    setDob("");
    setDobEstimate(false);
    setArrival(getTodayPT());
    setHandoff({});
    setShowForm(true);
  };

  const openEdit = (p: FosterPuppy) => {
    setEditing(p);
    setName(p.name);
    setDob(p.dob ?? "");
    setDobEstimate(p.dob_is_estimate);
    setArrival(p.arrival_date);
    setHandoff(
      Object.fromEntries(HANDOFF_FIELDS.map((f) => [f.key, (p[f.key] as string | null) ?? ""]))
    );
    setShowForm(true);
  };

  /** Trim every handoff field, storing empty ones as NULL. */
  const handoffPayload = () =>
    Object.fromEntries(
      HANDOFF_FIELDS.map((f) => [f.key, (handoff[f.key] ?? "").trim() || null])
    );

  const save = async () => {
    if (!household) return;
    if (!name.trim()) {
      showAlert("Name required", "Give the puppy a name so you can tell profiles apart.");
      return;
    }
    try {
      if (editing) {
        await updatePuppy.mutateAsync({
          id: editing.id,
          householdId: household.id,
          updates: {
            name: name.trim(),
            dob: dob || null,
            dob_is_estimate: dobEstimate,
            arrival_date: arrival || getTodayPT(),
            ...handoffPayload(),
          },
        });
      } else {
        await createPuppy.mutateAsync({
          household_id: household.id,
          name: name.trim(),
          dob: dob || null,
          dob_is_estimate: dobEstimate,
          arrival_date: arrival || getTodayPT(),
          ...handoffPayload(),
          // A brand-new profile becomes the one the Home button logs against.
          makeCurrent: true,
        });
      }
      setShowForm(false);
    } catch (e: any) {
      showAlert("Couldn't save", e?.message ?? "Please try again.");
    }
  };

  const handleDeactivate = (p: FosterPuppy) => {
    showConfirm(
      `${p.name} is no longer with us?`,
      "The profile moves to Past Fosters. All logged history is kept.",
      async () => {
        if (!household) return;
        try {
          await deactivate.mutateAsync({ id: p.id, householdId: household.id });
        } catch (e: any) {
          showAlert("Couldn't deactivate", e?.message ?? "Please try again.");
        }
      }
    );
  };

  const handleDelete = (p: FosterPuppy) => {
    showConfirm(
      `Delete ${p.name}?`,
      "This permanently removes the profile and every potty and meal entry logged for them. Deactivating instead keeps the history.",
      async () => {
        if (!household) return;
        try {
          await deletePuppy.mutateAsync({ id: p.id, householdId: household.id });
        } catch (e: any) {
          showAlert("Couldn't delete", e?.message ?? "Please try again.");
        }
      },
      true
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#FFF7ED]" edges={["top"]}>
      <AppHeader compact />

      <View className="flex-row items-center px-4 pb-2">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Text className="text-blue-600 text-base">‹ Back</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-900">🐶 Foster Puppy</Text>
        <TouchableOpacity
          onPress={() => router.push("/(app)/(foster)/report")}
          className="px-3 py-1.5 rounded-full border border-gray-300 bg-white"
        >
          <Text className="text-xs font-semibold text-gray-700">📊 Report</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Current puppy — the one the Home button logs against */}
        {current && (
          <TouchableOpacity onPress={() => setLogFor(current)} activeOpacity={0.85}>
            <Card className="mb-3 border-amber-200 bg-amber-50">
              <View className="flex-row items-center">
                <Text style={{ fontSize: 30 }} className="mr-3">🐶</Text>
                <View className="flex-1">
                  <Text className="text-lg font-bold text-gray-900">{current.name}</Text>
                  <Text className="text-xs text-gray-600 mt-0.5">
                    {describePuppy(current)}
                  </Text>
                </View>
                <Badge label="Current" variant="warning" size="sm" />
              </View>
              <View className="bg-amber-500 rounded-xl py-3 items-center mt-3">
                <Text className="text-white text-sm font-bold">Open Puppy Behavior Log</Text>
              </View>
            </Card>
          </TouchableOpacity>
        )}

        {!current && !isLoading && (
          <Card className="mb-3">
            <Text className="text-sm text-gray-600">
              {active.length === 0
                ? "No puppy profiles yet. Add one to start logging."
                : "Pick a current puppy below — that's who the Home button logs against."}
            </Text>
          </Card>
        )}

        <TouchableOpacity
          onPress={openNew}
          className="bg-gray-900 rounded-2xl py-3.5 items-center mb-4"
        >
          <Text className="text-white text-sm font-bold">+ New Puppy Profile</Text>
        </TouchableOpacity>

        {/* Active profiles */}
        {active.length > 0 && (
          <Text className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Profiles ({active.length})
          </Text>
        )}
        {active.map((p) => (
          <Card key={p.id} className="mb-2">
            <View className="flex-row items-start">
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-base font-semibold text-gray-900 mr-2">{p.name}</Text>
                  {p.is_current && <Badge label="Current" variant="warning" size="sm" />}
                </View>
                <Text className="text-xs text-gray-500 mt-0.5">{describePuppy(p)}</Text>
                {!!p.notes && (
                  <Text className="text-xs text-gray-500 mt-1">{p.notes}</Text>
                )}
              </View>
            </View>

            <View className="flex-row flex-wrap gap-2 mt-3">
              {!p.is_current && (
                <TouchableOpacity
                  onPress={() =>
                    household &&
                    setCurrent.mutate({ id: p.id, householdId: household.id })
                  }
                  className="px-3 py-1.5 rounded-full bg-amber-500"
                >
                  <Text className="text-xs font-semibold text-white">Set as Current</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={() => setLogFor(p)}
                className="px-3 py-1.5 rounded-full border border-gray-300 bg-white"
              >
                <Text className="text-xs font-semibold text-gray-700">Log</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => openEdit(p)}
                className="px-3 py-1.5 rounded-full border border-gray-300 bg-white"
              >
                <Text className="text-xs font-semibold text-gray-700">Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => handleDeactivate(p)}
                className="px-3 py-1.5 rounded-full border border-gray-300 bg-white"
              >
                <Text className="text-xs font-semibold text-gray-600">Deactivate</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {/* Past fosters */}
        {departed.length > 0 && (
          <>
            <Text className="text-xs font-semibold text-gray-500 uppercase mt-5 mb-2">
              Past Fosters ({departed.length})
            </Text>
            {departed.map((p) => (
              <Card key={p.id} className="mb-2 opacity-80">
                <View className="flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-base font-semibold text-gray-700">{p.name}</Text>
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {formatDateSlash(p.arrival_date)}
                      {p.departed_on ? ` – ${formatDateSlash(p.departed_on)}` : ""}
                    </Text>
                  </View>
                </View>
                <View className="flex-row gap-2 mt-3">
                  <TouchableOpacity
                    onPress={() =>
                      household && reactivate.mutate({ id: p.id, householdId: household.id })
                    }
                    className="px-3 py-1.5 rounded-full border border-gray-300 bg-white"
                  >
                    <Text className="text-xs font-semibold text-gray-700">Reactivate</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(p)}
                    className="px-3 py-1.5 rounded-full border border-red-200 bg-white"
                  >
                    <Text className="text-xs font-semibold text-red-600">Delete</Text>
                  </TouchableOpacity>
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      {/* New / edit profile */}
      <Modal visible={showForm} animationType="slide" transparent onRequestClose={() => setShowForm(false)}>
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl p-5 max-h-[88%]">
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text className="text-lg font-bold text-gray-900 mb-4">
                {editing ? `Edit ${editing.name}` : "New Puppy Profile"}
              </Text>

              <Text className="text-xs font-semibold text-gray-500 uppercase mb-1">Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Puppy's name"
                className="border border-gray-300 rounded-xl px-3 py-3 text-base bg-white mb-4"
              />

              <DateInput
                label="Date of birth"
                value={dob}
                onChange={setDob}
                hint="Drives their displayed age and the age-based #1 projection. An estimate is fine."
              />
              <TouchableOpacity
                onPress={() => setDobEstimate((v) => !v)}
                className="flex-row items-center mb-4 mt-1"
              >
                <View
                  className={`w-5 h-5 rounded border mr-2 items-center justify-center ${
                    dobEstimate ? "bg-blue-600 border-blue-600" : "border-gray-300 bg-white"
                  }`}
                >
                  {dobEstimate && <Text className="text-white text-xs">✓</Text>}
                </View>
                <Text className="text-sm text-gray-700">Date of birth is an estimate</Text>
              </TouchableOpacity>

              <DateInput
                label="Date they came to us"
                value={arrival}
                onChange={setArrival}
              />

              <View className="mt-5 mb-1 pt-4 border-t border-gray-100">
                <Text className="text-sm font-bold text-gray-900">Handoff info</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  What the next foster parent needs to know. All optional — everything
                  filled in here prints onto the report card.
                </Text>
              </View>

              {HANDOFF_FIELDS.map((f) => (
                <View key={f.key} className="mt-3">
                  <Text className="text-xs font-semibold text-gray-500 uppercase mb-1">
                    {f.label}
                  </Text>
                  <TextInput
                    value={handoff[f.key] ?? ""}
                    onChangeText={(v) => setField(f.key, v)}
                    placeholder={f.placeholder}
                    multiline
                    className="border border-gray-300 rounded-xl px-3 py-3 text-base bg-white h-20"
                    style={{ textAlignVertical: "top" }}
                  />
                </View>
              ))}

              <TouchableOpacity
                onPress={save}
                disabled={createPuppy.isPending || updatePuppy.isPending}
                className="bg-blue-600 rounded-2xl py-4 items-center mt-5"
              >
                <Text className="text-white text-base font-bold">
                  {createPuppy.isPending || updatePuppy.isPending
                    ? "Saving…"
                    : editing
                      ? "Save Changes"
                      : "Create Profile"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowForm(false)} className="py-3 items-center">
                <Text className="text-gray-500 text-sm">Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {logFor && (
        <PuppyLogModal visible={!!logFor} puppy={logFor} onClose={() => setLogFor(null)} />
      )}
    </SafeAreaView>
  );
}

function describePuppy(p: FosterPuppy): string {
  const age = computeAge(p.dob);
  const agePart = age ? `${age.label} old${p.dob_is_estimate ? " (est.)" : ""}` : "Age unknown";
  return `${agePart} · with us since ${formatDateSlash(p.arrival_date)}`;
}
