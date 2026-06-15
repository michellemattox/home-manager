import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { showAlert, showConfirm } from "@/lib/alert";
import { useHouseholdStore } from "@/stores/householdStore";
import { Card } from "@/components/ui/Card";
import { DraggableList, moveItem } from "@/components/ui/DraggableList";
import {
  usePackingTemplates,
  useCreateTemplate,
  useRenameTemplate,
  useDeleteTemplate,
  useAddTemplateItem,
  useUpdateTemplateItem,
  useDeleteTemplateItem,
  useReorderTemplateItems,
  type PackingTemplateWithItems,
  type PackingTemplateItem,
} from "@/hooks/usePackingTemplates";

function TemplateCard({
  template,
  householdId,
}: {
  template: PackingTemplateWithItems;
  householdId: string;
}) {
  const renameTemplate = useRenameTemplate();
  const deleteTemplate = useDeleteTemplate();
  const addItem = useAddTemplateItem();
  const updateItem = useUpdateTemplateItem();
  const deleteItem = useDeleteTemplateItem();
  const reorderItems = useReorderTemplateItems();

  const [name, setName] = useState(template.name);
  const [newItem, setNewItem] = useState("");
  // Local mirror of item order for instant drag/arrow feedback before the
  // server round-trips. Re-synced whenever the underlying item set changes.
  const [items, setItems] = useState<PackingTemplateItem[]>(template.items);

  useEffect(() => {
    setName(template.name);
  }, [template.name]);

  useEffect(() => {
    setItems(template.items);
    // Re-sync when items are added/removed or their server order changes.
  }, [template.items.map((i) => i.id).join(","), template.items.length]);

  const saveName = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === template.name) return;
    renameTemplate.mutate({ id: template.id, householdId, name: trimmed });
  };

  const handleReorder = (from: number, to: number) => {
    const next = moveItem(items, from, to);
    setItems(next);
    reorderItems.mutate({ householdId, orderedIds: next.map((i) => i.id) });
  };

  const handleAddItem = () => {
    const title = newItem.trim();
    if (!title) return;
    addItem.mutate({
      templateId: template.id,
      householdId,
      title,
      sortOrder: items.length,
    });
    setNewItem("");
  };

  const handleDeleteTemplate = () => {
    showConfirm(
      `Delete "${template.name}"?`,
      items.length > 0
        ? `This permanently removes the list and its ${items.length} item${items.length === 1 ? "" : "s"}.`
        : "This empty list will be removed.",
      () => deleteTemplate.mutate({ id: template.id, householdId }),
      true
    );
  };

  return (
    <Card className="mb-4">
      <View className="flex-row items-center mb-3">
        <TextInput
          className="flex-1 text-base font-semibold text-gray-900 border-b border-gray-100 pb-1"
          value={name}
          onChangeText={setName}
          onEndEditing={saveName}
          onBlur={saveName}
          placeholder="List name"
          placeholderTextColor="#9ca3af"
        />
        <TouchableOpacity onPress={handleDeleteTemplate} className="ml-2 px-2 py-1">
          <Text className="text-red-400 text-xs font-medium">Delete list</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text className="text-gray-400 text-sm py-2">No items yet — add one below.</Text>
      ) : (
        <DraggableList
          data={items}
          keyExtractor={(i) => i.id}
          onReorder={handleReorder}
          renderContent={(item) => (
            <View className="flex-row items-center">
              <TextInput
                className="flex-1 text-sm text-gray-800 py-1"
                defaultValue={item.title}
                onEndEditing={(e) => {
                  const t = e.nativeEvent.text.trim();
                  if (t && t !== item.title) {
                    updateItem.mutate({ id: item.id, householdId, title: t });
                  }
                }}
                placeholderTextColor="#9ca3af"
              />
              <TouchableOpacity
                onPress={() =>
                  showConfirm(
                    "Remove item?",
                    `"${item.title}" will be removed from this list.`,
                    () => deleteItem.mutate({ id: item.id, householdId }),
                    true
                  )
                }
                className="px-2 py-1"
              >
                <Text className="text-gray-300 text-base leading-none">×</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      <View className="flex-row items-center gap-2 mt-3">
        <TextInput
          className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900"
          value={newItem}
          onChangeText={setNewItem}
          onSubmitEditing={handleAddItem}
          placeholder="Add an item (e.g. Toothbrush)"
          placeholderTextColor="#9ca3af"
          returnKeyType="done"
        />
        <TouchableOpacity
          onPress={handleAddItem}
          disabled={!newItem.trim()}
          className={`px-3 py-2 rounded-xl ${newItem.trim() ? "bg-blue-600" : "bg-gray-200"}`}
        >
          <Text className={`text-sm font-semibold ${newItem.trim() ? "text-white" : "text-gray-400"}`}>
            Add
          </Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function PackingTemplatesScreen() {
  const router = useRouter();
  const { household } = useHouseholdStore();
  const { data: templates = [], isLoading } = usePackingTemplates(household?.id);
  const createTemplate = useCreateTemplate();

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed || !household) return;
    createTemplate.mutate(
      { householdId: household.id, name: trimmed, sortOrder: templates.length },
      { onError: (e: any) => showAlert("Error", e.message) }
    );
    setNewName("");
    setShowNew(false);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Text className="text-blue-600 text-base">← Settings</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-semibold text-gray-900">Packing List Templates</Text>
      </View>

      <ScrollView contentContainerClassName="px-4 py-4 pb-16" keyboardShouldPersistTaps="handled">
        <Text className="text-xs text-gray-500 mb-4">
          Build reusable packing lists here. When you create or edit an Activity, tap{" "}
          <Text className="font-semibold">Apply Templates</Text> to drop these items in. Picking
          several lists merges them and removes duplicates. Drag the ≡ handle or use ▲▼ to reorder.
        </Text>

        {isLoading ? (
          <Text className="text-gray-400 text-sm">Loading…</Text>
        ) : templates.length === 0 ? (
          <View className="items-center py-10">
            <Text className="text-4xl mb-3">🧳</Text>
            <Text className="text-base font-semibold text-gray-700">No templates yet</Text>
            <Text className="text-sm text-gray-400 mt-1 text-center">
              Create your first packing list below.
            </Text>
          </View>
        ) : (
          household &&
          templates.map((t) => (
            <TemplateCard key={t.id} template={t} householdId={household.id} />
          ))
        )}

        {showNew ? (
          <View className="flex-row items-center gap-2 mt-2">
            <TextInput
              className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900"
              value={newName}
              onChangeText={setNewName}
              onSubmitEditing={handleCreate}
              placeholder="New list name (e.g. Beach Trip)"
              placeholderTextColor="#9ca3af"
              autoFocus
              returnKeyType="done"
            />
            <TouchableOpacity
              onPress={handleCreate}
              disabled={!newName.trim()}
              className={`px-3 py-2.5 rounded-xl ${newName.trim() ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <Text className={`text-sm font-semibold ${newName.trim() ? "text-white" : "text-gray-400"}`}>
                Create
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowNew(false); setNewName(""); }}>
              <Text className="text-gray-400 text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowNew(true)}
            className="bg-blue-600 rounded-xl py-3 items-center mt-2"
          >
            <Text className="text-white text-sm font-semibold">+ New Packing List</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
