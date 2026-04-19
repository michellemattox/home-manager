import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import {
  useGifts,
  useCreateGift,
  useUpdateGift,
  useMarkGiftBought,
  useDeleteGift,
  useClearGiftTotals,
} from "@/hooks/useGifts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { showAlert, showConfirm } from "@/lib/alert";
import { formatDateShort } from "@/utils/dateUtils";
import type { Gift, GiftPriority } from "@/types/app.types";
import { AppHeader } from "@/components/ui/AppHeader";

type SortMode = "priority" | "price" | "date_added";

const PRIORITY_OPTIONS: { label: string; value: GiftPriority }[] = [
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const PRIORITY_RANK: Record<GiftPriority, number> = { high: 0, medium: 1, low: 2 };
const PRIORITY_VARIANT: Record<GiftPriority, "danger" | "warning" | "info"> = {
  high: "danger",
  medium: "warning",
  low: "info",
};

function normalizeUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

function formatPrice(p: number | null): string {
  if (p == null) return "";
  return `$${p.toFixed(2)}`;
}

// ─── GiftFormFields (outside screen to prevent focus loss) ─────────────────────
function GiftFormFields(props: {
  name: string; setName: (v: string) => void;
  giftDate: string; setGiftDate: (v: string) => void;
  priority: GiftPriority | null; setPriority: (v: GiftPriority | null) => void;
  store: string; setStore: (v: string) => void;
  price: string; setPrice: (v: string) => void;
  color: string; setColor: (v: string) => void;
  size: string; setSize: (v: string) => void;
  link: string; setLink: (v: string) => void;
}) {
  const { name, setName, giftDate, setGiftDate, priority, setPriority,
    store, setStore, price, setPrice, color, setColor, size, setSize, link, setLink } = props;
  return (
    <>
      <Text className="text-sm font-medium text-gray-700 mb-1">Gift Name</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
        value={name}
        onChangeText={setName}
        placeholder="e.g. Noise-cancelling headphones"
        placeholderTextColor="#9ca3af"
        autoFocus
      />

      <DateInput label="Date" value={giftDate} onChange={setGiftDate} />

      <Text className="text-sm font-medium text-gray-700 mb-2">Priority</Text>
      <View className="flex-row gap-2 mb-4">
        {PRIORITY_OPTIONS.map((p) => {
          const active = priority === p.value;
          return (
            <TouchableOpacity
              key={p.value}
              onPress={() => setPriority(active ? null : p.value)}
              className={`flex-1 py-2.5 rounded-xl border items-center ${
                active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
              }`}
            >
              <Text className={`text-sm font-semibold ${active ? "text-white" : "text-gray-700"}`}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text className="text-sm font-medium text-gray-700 mb-1">Store</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
        value={store}
        onChangeText={setStore}
        placeholder="e.g. Amazon"
        placeholderTextColor="#9ca3af"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Price</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
        value={price}
        onChangeText={setPrice}
        placeholder="e.g. 49.99"
        placeholderTextColor="#9ca3af"
        keyboardType="decimal-pad"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Color / Material</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
        value={color}
        onChangeText={setColor}
        placeholder="e.g. Navy blue, leather"
        placeholderTextColor="#9ca3af"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Size</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
        value={size}
        onChangeText={setSize}
        placeholder="e.g. Medium, 9.5"
        placeholderTextColor="#9ca3af"
      />

      <Text className="text-sm font-medium text-gray-700 mb-1">Link to Item</Text>
      <TextInput
        className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 mb-4"
        value={link}
        onChangeText={setLink}
        placeholder="e.g. amazon.com/product/..."
        placeholderTextColor="#9ca3af"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </>
  );
}

function GiftCard({
  gift,
  viewerIsRecipient,
  buyerName,
  onMarkBought,
  onEdit,
  onDelete,
}: {
  gift: Gift;
  viewerIsRecipient: boolean;
  buyerName: string | null;
  onMarkBought: (gift: Gift, bought: boolean) => void;
  onEdit: (gift: Gift) => void;
  onDelete: (gift: Gift) => void;
}) {
  const openLink = async () => {
    if (!gift.link) return;
    try {
      await Linking.openURL(gift.link);
    } catch {
      showAlert("Unable to open link", gift.link);
    }
  };

  // Recipient (viewer) must see a "clean" view — no bought state hints.
  const showBought = !viewerIsRecipient && gift.bought;

  return (
    <Card className="mb-3">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1 mr-2">
          {gift.link ? (
            <TouchableOpacity onPress={openLink}>
              <Text className="text-sm font-semibold text-blue-600 underline">
                {gift.name || "Untitled gift"}
              </Text>
            </TouchableOpacity>
          ) : (
            <Text className="text-sm font-semibold text-gray-900">
              {gift.name || "Untitled gift"}
            </Text>
          )}
        </View>
        {gift.priority && (
          <Badge
            label={gift.priority.charAt(0).toUpperCase() + gift.priority.slice(1)}
            variant={PRIORITY_VARIANT[gift.priority]}
            size="sm"
          />
        )}
      </View>

      <View className="flex-row flex-wrap gap-x-3 gap-y-1">
        {gift.gift_date && (
          <Text className="text-xs text-gray-400">📅 {formatDateShort(gift.gift_date)}</Text>
        )}
        {gift.price != null && (
          <Text className="text-xs font-semibold text-gray-600">{formatPrice(gift.price)}</Text>
        )}
        {gift.store && <Text className="text-xs text-gray-500">🏬 {gift.store}</Text>}
        {gift.color_material && (
          <Text className="text-xs text-gray-500">🎨 {gift.color_material}</Text>
        )}
        {gift.size && <Text className="text-xs text-gray-500">📏 {gift.size}</Text>}
      </View>

      {showBought && (
        <View className="mt-2">
          <Badge
            label={buyerName ? `✓ Bought by ${buyerName}` : "✓ Bought"}
            variant="success"
            size="sm"
          />
        </View>
      )}

      <View className="mt-3 pt-2 border-t border-gray-100 flex-row flex-wrap gap-2">
        {!viewerIsRecipient && (
          <TouchableOpacity
            onPress={() => onMarkBought(gift, !gift.bought)}
            className={`px-3 py-1.5 rounded-full border ${
              gift.bought
                ? "bg-green-50 border-green-200"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                gift.bought ? "text-green-700" : "text-gray-700"
              }`}
            >
              {gift.bought ? "✓ Bought" : "Mark Bought"}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onEdit(gift)} className="px-3 py-1.5">
          <Text className="text-xs text-gray-500">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDelete(gift)} className="px-3 py-1.5">
          <Text className="text-xs text-red-400">Delete</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

export default function GiftsScreen() {
  const { household, members } = useHouseholdStore();
  const { user } = useAuthStore();
  const currentMember = members.find((m) => m.user_id === user?.id);

  const { data: gifts = [], isLoading, refetch } = useGifts(household?.id);
  const createGift = useCreateGift();
  const updateGift = useUpdateGift();
  const markBought = useMarkGiftBought();
  const deleteGift = useDeleteGift();
  const clearTotals = useClearGiftTotals();

  // Filter / sort state
  const [recipientFilter, setRecipientFilter] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<SortMode>("priority");

  // New gift modal
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [newPriority, setNewPriority] = useState<GiftPriority | null>(null);
  const [newRecipient, setNewRecipient] = useState<string | null>(null);
  const [newStore, setNewStore] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newSize, setNewSize] = useState("");
  const [newLink, setNewLink] = useState("");

  // Edit modal
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPriority, setEditPriority] = useState<GiftPriority | null>(null);
  const [editStore, setEditStore] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editLink, setEditLink] = useState("");

  const resetNewForm = () => {
    setNewName("");
    setNewDate(new Date().toISOString().split("T")[0]);
    setNewPriority(null);
    setNewRecipient(null);
    setNewStore("");
    setNewPrice("");
    setNewColor("");
    setNewSize("");
    setNewLink("");
  };

  // Running total for current user (what they've spent across all recipients,
  // excluding items already cleared).
  const myRunningTotal = useMemo(() => {
    if (!currentMember) return 0;
    return gifts
      .filter(
        (g) =>
          g.bought &&
          g.bought_by_member_id === currentMember.id &&
          g.totals_cleared_at == null &&
          g.price != null
      )
      .reduce((sum, g) => sum + Number(g.price), 0);
  }, [gifts, currentMember]);

  // Apply recipient filter
  const visibleGifts = useMemo(() => {
    const base = recipientFilter
      ? gifts.filter((g) => g.recipient_member_id === recipientFilter)
      : gifts;
    const sorted = [...base];
    if (sortMode === "priority") {
      sorted.sort((a, b) => {
        const ra = a.priority ? PRIORITY_RANK[a.priority] : 99;
        const rb = b.priority ? PRIORITY_RANK[b.priority] : 99;
        if (ra !== rb) return ra - rb;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sortMode === "price") {
      sorted.sort((a, b) => {
        const pa = a.price == null ? -Infinity : Number(a.price);
        const pb = b.price == null ? -Infinity : Number(b.price);
        return pb - pa;
      });
    } else if (sortMode === "date_added") {
      sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      );
    }
    return sorted;
  }, [gifts, recipientFilter, sortMode]);

  const handleCreate = async () => {
    if (!household || !currentMember) return;
    const recipientId = newRecipient ?? currentMember.id;
    try {
      await createGift.mutateAsync({
        household_id: household.id,
        recipient_member_id: recipientId,
        added_by_member_id: currentMember.id,
        name: newName.trim() || null,
        gift_date: newDate || null,
        priority: newPriority,
        store: newStore.trim() || null,
        price: newPrice.trim() ? Number(newPrice) : null,
        color_material: newColor.trim() || null,
        size: newSize.trim() || null,
        link: newLink.trim() ? normalizeUrl(newLink) : null,
      });
      setShowNewModal(false);
      resetNewForm();
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const openEdit = (gift: Gift) => {
    setEditingGift(gift);
    setEditName(gift.name ?? "");
    setEditDate(gift.gift_date ?? "");
    setEditPriority(gift.priority);
    setEditStore(gift.store ?? "");
    setEditPrice(gift.price != null ? String(gift.price) : "");
    setEditColor(gift.color_material ?? "");
    setEditSize(gift.size ?? "");
    setEditLink(gift.link ?? "");
  };

  const handleSaveEdit = async () => {
    if (!editingGift || !household) return;
    try {
      await updateGift.mutateAsync({
        id: editingGift.id,
        householdId: household.id,
        updates: {
          name: editName.trim() || null,
          gift_date: editDate || null,
          priority: editPriority,
          store: editStore.trim() || null,
          price: editPrice.trim() ? Number(editPrice) : null,
          color_material: editColor.trim() || null,
          size: editSize.trim() || null,
          link: editLink.trim() ? normalizeUrl(editLink) : null,
        },
      });
      setEditingGift(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleMarkBought = async (gift: Gift, bought: boolean) => {
    if (!household || !currentMember) return;
    try {
      await markBought.mutateAsync({
        id: gift.id,
        householdId: household.id,
        buyerId: currentMember.id,
        bought,
      });
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleDelete = (gift: Gift) => {
    if (!household) return;
    showConfirm(
      "Delete gift?",
      `"${gift.name || "This gift"}" will be removed.`,
      () => deleteGift.mutate({ id: gift.id, householdId: household.id }),
      true
    );
  };

  const handleClearTotals = () => {
    if (!household) return;
    showConfirm(
      "Clear totals?",
      "This zeroes the running totals for both users. Gift items stay on the lists.",
      () => clearTotals.mutate(household.id),
      true
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F5E7D3]" edges={["top"]}>
      <AppHeader compact />
      <View className="px-4 py-3 flex-row items-center">
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">Gifts</Text>
          <Text className="text-xs text-gray-400">
            Shared wish lists and gift tracking.
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowNewModal(true)}
          className="bg-blue-600 rounded-full px-4 py-2"
        >
          <Text className="text-white text-sm font-semibold">+ New</Text>
        </TouchableOpacity>
      </View>

      {/* Running total + clear */}
      {currentMember && (
        <View className="px-4 pb-2">
          <Card className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-gray-400 uppercase tracking-wider">
                Your total spent
              </Text>
              <Text className="text-xl font-bold text-gray-900 mt-1">
                ${myRunningTotal.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleClearTotals}
              className="px-3 py-1.5 rounded-full bg-white border border-gray-200"
            >
              <Text className="text-xs font-semibold text-gray-700">Clear Totals</Text>
            </TouchableOpacity>
          </Card>
        </View>
      )}

      {/* Recipient filter */}
      <View className="px-4 py-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            onPress={() => setRecipientFilter(null)}
            className={`px-3 py-1.5 rounded-full border mr-2 ${
              recipientFilter === null
                ? "bg-blue-600 border-blue-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                recipientFilter === null ? "text-white" : "text-gray-600"
              }`}
            >
              All lists
            </Text>
          </TouchableOpacity>
          {members.map((m) => {
            const active = recipientFilter === m.id;
            const isYou = m.id === currentMember?.id;
            return (
              <TouchableOpacity
                key={m.id}
                onPress={() => setRecipientFilter(active ? null : m.id)}
                className={`px-3 py-1.5 rounded-full border mr-2 ${
                  active ? "bg-indigo-600 border-indigo-600" : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-white" : "text-gray-600"
                  }`}
                >
                  {m.display_name}
                  {isYou ? " (You)" : ""}'s list
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Sort */}
      <View className="px-4 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {([
            { v: "priority", l: "Priority (High → Low)" },
            { v: "price", l: "Price (High → Low)" },
            { v: "date_added", l: "Date Added (Oldest)" },
          ] as const).map((s) => {
            const active = sortMode === s.v;
            return (
              <TouchableOpacity
                key={s.v}
                onPress={() => setSortMode(s.v as SortMode)}
                className={`px-3 py-1.5 rounded-full border mr-2 ${
                  active ? "bg-gray-900 border-gray-900" : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    active ? "text-white" : "text-gray-600"
                  }`}
                >
                  {s.l}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerClassName="px-4 py-4 pb-12"
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
      >
        {visibleGifts.length === 0 ? (
          <View className="items-center py-16">
            <Text className="text-4xl mb-3">🎁</Text>
            <Text className="text-base font-semibold text-gray-700">No gifts yet</Text>
            <Text className="text-sm text-gray-400 mt-1 text-center">
              Tap + New to add an idea to a list.
            </Text>
          </View>
        ) : (
          visibleGifts.map((g) => {
            const viewerIsRecipient = g.recipient_member_id === currentMember?.id;
            const recipient = members.find((m) => m.id === g.recipient_member_id);
            const buyer = members.find((m) => m.id === g.bought_by_member_id);
            return (
              <View key={g.id}>
                {recipientFilter === null && recipient && (
                  <Text className="text-xs text-gray-400 mb-1 px-1">
                    For {recipient.display_name}
                    {recipient.id === currentMember?.id ? " (You)" : ""}
                  </Text>
                )}
                <GiftCard
                  gift={g}
                  viewerIsRecipient={viewerIsRecipient}
                  buyerName={buyer?.display_name ?? null}
                  onMarkBought={handleMarkBought}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── New Gift Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showNewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewModal(false)}
      >
        <SafeAreaView className="flex-1 bg-[#F5E7D3]">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity
              onPress={() => {
                setShowNewModal(false);
                resetNewForm();
              }}
              className="mr-4"
            >
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">New Gift</Text>
          </View>
          <ScrollView
            contentContainerClassName="px-4 py-4"
            keyboardShouldPersistTaps="handled"
          >
            <Text className="text-sm font-medium text-gray-700 mb-2">For</Text>
            <View className="flex-row flex-wrap gap-2 mb-4">
              {members.map((m) => {
                const active = (newRecipient ?? currentMember?.id) === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setNewRecipient(m.id)}
                    className={`px-3 py-1.5 rounded-full border ${
                      active ? "bg-blue-600 border-blue-600" : "bg-white border-gray-200"
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        active ? "text-white" : "text-gray-700"
                      }`}
                    >
                      {m.display_name}
                      {m.id === currentMember?.id ? " (You)" : ""}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <GiftFormFields
              name={newName} setName={setNewName}
              giftDate={newDate} setGiftDate={setNewDate}
              priority={newPriority} setPriority={setNewPriority}
              store={newStore} setStore={setNewStore}
              price={newPrice} setPrice={setNewPrice}
              color={newColor} setColor={setNewColor}
              size={newSize} setSize={setNewSize}
              link={newLink} setLink={setNewLink}
            />

            <TouchableOpacity
              onPress={handleCreate}
              disabled={createGift.isPending}
              className="py-3 rounded-xl items-center bg-blue-600"
            >
              <Text className="text-sm font-semibold text-white">
                {createGift.isPending ? "Saving..." : "Add Gift"}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Edit Gift Modal ───────────────────────────────────────────────── */}
      <Modal
        visible={!!editingGift}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setEditingGift(null)}
      >
        <SafeAreaView className="flex-1 bg-[#F5E7D3]">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100 bg-white">
            <TouchableOpacity onPress={() => setEditingGift(null)} className="mr-4">
              <Text className="text-blue-600 text-base">Cancel</Text>
            </TouchableOpacity>
            <Text className="flex-1 text-lg font-semibold text-gray-900">Edit Gift</Text>
            <TouchableOpacity
              onPress={handleSaveEdit}
              disabled={updateGift.isPending}
            >
              <Text className="text-base font-semibold text-blue-600">
                {updateGift.isPending ? "Saving…" : "Save"}
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerClassName="px-4 py-4"
            keyboardShouldPersistTaps="handled"
          >
            <GiftFormFields
              name={editName} setName={setEditName}
              giftDate={editDate} setGiftDate={setEditDate}
              priority={editPriority} setPriority={setEditPriority}
              store={editStore} setStore={setEditStore}
              price={editPrice} setPrice={setEditPrice}
              color={editColor} setColor={setEditColor}
              size={editSize} setSize={setEditSize}
              link={editLink} setLink={setEditLink}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
