import React, { useRef, useState, useMemo } from "react";
import { useAutoSave } from "@/hooks/useAutoSave";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  RefreshControl,
  Linking,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useHouseholdStore } from "@/stores/householdStore";
import { useAuthStore } from "@/stores/authStore";
import { useGiftFilterStore } from "@/stores/giftFilterStore";
import { useAppRefresh } from "@/hooks/useAppRefresh";
import {
  useGifts,
  useCreateGift,
  useUpdateGift,
  useMarkGiftBought,
  useMarkGiftSetBought,
  useMoveGiftSetToList,
  useDeleteGift,
  useClearGiftTotals,
} from "@/hooks/useGifts";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { DateInput } from "@/components/ui/DateInput";
import { SearchBar } from "@/components/ui/SearchBar";
import { matchesQuery } from "@/utils/searchUtils";
import { showAlert, showConfirm } from "@/lib/alert";
import { formatDateSlash } from "@/utils/dateUtils";
import type { Gift, GiftPriority } from "@/types/app.types";
import { AppHeader } from "@/components/ui/AppHeader";

import type { GiftSortMode } from "@/stores/giftFilterStore";
type SortMode = GiftSortMode;

// Sentinel recipient id for the shared "Home" list (stored as NULL in DB).
const HOME_LIST_ID = "__home__";

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
  setName_: string; setSetName: (v: string) => void;
  setSuggestions: string[];
}) {
  const { name, setName, giftDate, setGiftDate, priority, setPriority,
    store, setStore, price, setPrice, color, setColor, size, setSize, link, setLink,
    setName_, setSetName, setSuggestions } = props;

  // Inline autocomplete against existing set names on the current list. The
  // ghost suggestion is the first set name that starts with what's typed (but
  // isn't already an exact match). It disappears the moment the typed text stops
  // being a prefix of any set, and reappears if you delete back to a prefix.
  const ghostSuggestion = useMemo(() => {
    if (!setName_) return null;
    const lower = setName_.toLowerCase();
    const match = setSuggestions.find(
      (s) => s.toLowerCase().startsWith(lower) && s.toLowerCase() !== lower
    );
    return match ?? null;
  }, [setName_, setSuggestions]);
  // Grey portion shown after the typed text. Slicing by the raw typed length
  // keeps the overlay aligned with the visible input (the typed prefix is
  // rendered transparent underneath the real input text).
  const ghostRemainder = ghostSuggestion ? ghostSuggestion.slice(setName_.length) : "";

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

      <Text className="text-sm font-medium text-gray-700 mb-1">Gift Set (optional)</Text>
      <View className="relative mb-1">
        <TextInput
          className="bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900"
          value={setName_}
          onChangeText={setSetName}
          placeholder="e.g. Ski Outfit"
          placeholderTextColor="#9ca3af"
          onKeyPress={(e: any) => {
            if (Platform.OS !== "web") return;
            const key = e?.nativeEvent?.key;
            if (key === "Tab" && ghostSuggestion) {
              e.preventDefault?.();
              setSetName(ghostSuggestion);
            }
          }}
        />
        {/* Web-only greyed inline completion, aligned under the real input text. */}
        {Platform.OS === "web" && ghostRemainder ? (
          <View
            pointerEvents="none"
            className="absolute left-0 right-0 top-0 bottom-0 px-3 py-2.5"
          >
            <Text className="text-sm" numberOfLines={1}>
              <Text className="text-sm" style={{ color: "transparent" }}>
                {setName_}
              </Text>
              <Text className="text-sm text-gray-400">{ghostRemainder}</Text>
            </Text>
          </View>
        ) : null}
      </View>
      {/* Tappable suggestion pill — the reliable accept path on touch devices. */}
      {ghostSuggestion ? (
        <TouchableOpacity
          onPress={() => setSetName(ghostSuggestion)}
          className="self-start flex-row items-center gap-1.5 mb-1 px-2.5 py-1 rounded-full bg-indigo-50 border border-indigo-200"
        >
          <Text className="text-xs font-semibold text-indigo-700">{ghostSuggestion}</Text>
          <Text className="text-[10px] text-indigo-400">
            {Platform.OS === "web" ? "Tab ⇥ or tap" : "tap to use"}
          </Text>
        </TouchableOpacity>
      ) : null}
      <Text className="text-xs text-gray-400 mb-4">
        Give two or more items on the same list the same set name to mark them as meant to be
        purchased together.
      </Text>
    </>
  );
}

function GiftCard({
  gift,
  canSeeBought,
  canMarkBought,
  buyerName,
  storeHint,
  onMarkBought,
  onEdit,
  onDelete,
}: {
  gift: Gift;
  canSeeBought: boolean;
  canMarkBought: boolean;
  buyerName: string | null;
  storeHint: string | null;
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

  const showBought = canSeeBought && gift.bought;

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
          <Text className="text-xs text-gray-400">📅 {formatDateSlash(gift.gift_date)}</Text>
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

      {storeHint && (
        <View className="mt-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          <Text className="text-xs text-amber-800">💡 {storeHint}</Text>
        </View>
      )}

      <View className="mt-3 pt-2 border-t border-gray-100 flex-row flex-wrap gap-2">
        {canMarkBought && (
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

  const { data: gifts = [], isLoading } = useGifts(household?.id);
  const { refreshing, onRefresh } = useAppRefresh();
  const createGift = useCreateGift();
  const updateGift = useUpdateGift();
  const markBought = useMarkGiftBought();
  const markSetBought = useMarkGiftSetBought();
  const moveGiftSet = useMoveGiftSetToList();
  const deleteGift = useDeleteGift();
  const clearTotals = useClearGiftTotals();

  // Filter / sort state — recipient + sort + panel state persist across sessions;
  // search query is intentionally session-only (cleared on app close).
  const recipientFilter = useGiftFilterStore((s) => s.recipientFilter);
  const setRecipientFilter = useGiftFilterStore((s) => s.setRecipientFilter);
  const sortMode = useGiftFilterStore((s) => s.sortMode);
  const setSortMode = useGiftFilterStore((s) => s.setSortMode);
  const filtersOpen = useGiftFilterStore((s) => s.filtersOpen);
  const setFiltersOpen = useGiftFilterStore((s) => s.setFiltersOpen);
  const [searchQuery, setSearchQuery] = useState("");
  const giftActiveFilterCount = (recipientFilter !== null ? 1 : 0) + (sortMode !== "priority" ? 1 : 0);

  // Set "buy together" mark-bought prompt (Feature 2)
  const [setBoughtPrompt, setSetBoughtPrompt] = useState<{
    gift: Gift;
    bought: boolean;
    setName: string;
    recipientId: string | null;
    count: number;
  } | null>(null);

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
  const [newSetName, setNewSetName] = useState("");
  const [newGiftDraftId, setNewGiftDraftId] = useState<string | null>(null);

  // Auto-save: create draft once name is non-empty, then update that row as user edits.
  const newGiftAutosave = useAutoSave({
    enabled: showNewModal && !!household && !!currentMember,
    value: { newName, newDate, newPriority, newRecipient, newStore, newPrice, newColor, newSize, newLink, newSetName, newGiftDraftId },
    initialValue: { newName: "", newDate: "", newPriority: null as GiftPriority | null, newRecipient: null as string | null, newStore: "", newPrice: "", newColor: "", newSize: "", newLink: "", newSetName: "", newGiftDraftId: null as string | null },
    canSave: (v) => (v.newName.trim().length > 0) && !!household && !!currentMember,
    onSave: async (v) => {
      if (!household || !currentMember) return;
      const recipientId = v.newRecipient === HOME_LIST_ID ? null : (v.newRecipient ?? currentMember.id);
      const payload = {
        name: v.newName.trim() || null,
        gift_date: v.newDate || null,
        priority: v.newPriority,
        store: v.newStore.trim() || null,
        price: v.newPrice.trim() ? Number(v.newPrice) : null,
        color_material: v.newColor.trim() || null,
        size: v.newSize.trim() || null,
        link: v.newLink.trim() ? normalizeUrl(v.newLink) : null,
        set_name: v.newSetName.trim() || null,
      } as const;
      if (v.newGiftDraftId) {
        await updateGift.mutateAsync({
          id: v.newGiftDraftId,
          householdId: household.id,
          updates: { ...payload, recipient_member_id: recipientId } as any,
        });
      } else {
        const created = await createGift.mutateAsync({
          household_id: household.id,
          recipient_member_id: recipientId,
          added_by_member_id: currentMember.id,
          ...payload,
        });
        setNewGiftDraftId((created as any).id);
      }
    },
  });

  // Edit modal
  const [editingGift, setEditingGift] = useState<Gift | null>(null);
  const [editRecipient, setEditRecipient] = useState<string>(""); // member id or HOME_LIST_ID
  // When moving a set member to another list, ask whether to move just it or the set.
  const [moveListPrompt, setMoveListPrompt] = useState<{
    targetChip: string;
    targetLabel: string;
    setName: string;
    count: number;
  } | null>(null);
  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editPriority, setEditPriority] = useState<GiftPriority | null>(null);
  const [editStore, setEditStore] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editColor, setEditColor] = useState("");
  const [editSize, setEditSize] = useState("");
  const [editLink, setEditLink] = useState("");
  const [editSetName, setEditSetName] = useState("");
  const giftEditInitialRef = useRef({ name: "", date: "", priority: null as GiftPriority | null, store: "", price: "", color: "", size: "", link: "", setName: "" });

  const giftEditAutosave = useAutoSave({
    enabled: !!editingGift && !!household,
    value: { name: editName, date: editDate, priority: editPriority, store: editStore, price: editPrice, color: editColor, size: editSize, link: editLink, setName: editSetName },
    initialValue: giftEditInitialRef.current,
    canSave: (_v) => true,
    onSave: async (v) => {
      if (!editingGift || !household) return;
      await updateGift.mutateAsync({
        id: editingGift.id,
        householdId: household.id,
        updates: {
          name: v.name.trim() || null,
          gift_date: v.date || null,
          priority: v.priority,
          store: v.store.trim() || null,
          price: v.price.trim() ? Number(v.price) : null,
          color_material: v.color.trim() || null,
          size: v.size.trim() || null,
          link: v.link.trim() ? normalizeUrl(v.link) : null,
          set_name: v.setName.trim() || null,
        },
      });
    },
  });

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
    setNewSetName("");
    setNewGiftDraftId(null);
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

  // Apply recipient filter (HOME_LIST_ID matches gifts with null recipient) + search
  const visibleGifts = useMemo(() => {
    let base =
      recipientFilter === HOME_LIST_ID
        ? gifts.filter((g) => g.recipient_member_id == null)
        : recipientFilter
        ? gifts.filter((g) => g.recipient_member_id === recipientFilter)
        : gifts;
    if (searchQuery.trim()) {
      base = base.filter((g) => {
        const recipientName = g.recipient_member_id == null
          ? "Home"
          : members.find((m) => m.id === g.recipient_member_id)?.display_name;
        const buyerName = g.bought_by_member_id
          ? members.find((m) => m.id === g.bought_by_member_id)?.display_name
          : null;
        return matchesQuery(
          searchQuery,
          g.name,
          g.store,
          g.color_material,
          g.size,
          g.priority,
          g.price,
          recipientName,
          buyerName,
        );
      });
    }
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
      sorted.sort((a, b) => {
        // Sort by gift_date (oldest → newest). Items without a gift_date fall to the end.
        if (!a.gift_date && !b.gift_date) return 0;
        if (!a.gift_date) return 1;
        if (!b.gift_date) return -1;
        return a.gift_date.localeCompare(b.gift_date);
      });
    } else if (sortMode === "store") {
      sorted.sort((a, b) => {
        const sa = (a.store ?? "").toLowerCase();
        const sb = (b.store ?? "").toLowerCase();
        if (!sa && !sb) return 0;
        if (!sa) return 1;
        if (!sb) return -1;
        return sa.localeCompare(sb);
      });
    }
    return sorted;
  }, [gifts, recipientFilter, sortMode, searchQuery, members]);

  // Group visible gifts into render units: standalone cards, or "sets" of 2+
  // items that share a set name within the same list (Feature 2).
  const setKeyOf = (g: Gift) =>
    `${g.recipient_member_id ?? "home"}::${(g.set_name ?? "").trim().toLowerCase()}`;
  type RenderUnit =
    | { type: "single"; gift: Gift }
    | { type: "set"; key: string; setName: string; recipientId: string | null; gifts: Gift[] };
  const renderUnits = useMemo<RenderUnit[]>(() => {
    const units: RenderUnit[] = [];
    const seen = new Set<string>();
    for (const g of visibleGifts) {
      if (g.set_name && g.set_name.trim()) {
        const key = setKeyOf(g);
        if (seen.has(key)) continue;
        seen.add(key);
        const groupGifts = visibleGifts.filter(
          (x) => x.set_name && x.set_name.trim() && setKeyOf(x) === key
        );
        if (groupGifts.length >= 2) {
          units.push({
            type: "set",
            key,
            setName: g.set_name.trim(),
            recipientId: g.recipient_member_id ?? null,
            gifts: groupGifts,
          });
          continue;
        }
      }
      units.push({ type: "single", gift: g });
    }
    return units;
  }, [visibleGifts]);

  // Build store → [{ gift, recipientId }] index for cross-list hints.
  // Groups all household gifts by normalized store name.
  const storeIndex = useMemo(() => {
    const map = new Map<string, Gift[]>();
    for (const g of gifts) {
      if (!g.store) continue;
      const key = g.store.trim().toLowerCase();
      if (!key) continue;
      const arr = map.get(key) ?? [];
      arr.push(g);
      map.set(key, arr);
    }
    return map;
  }, [gifts]);

  // For a given gift, produce a hint about other items from the same store
  // that sit on a *different* recipient's list. Returns null if nothing to show.
  const buildStoreHint = (gift: Gift): string | null => {
    if (!gift.store) return null;
    const key = gift.store.trim().toLowerCase();
    const peers = (storeIndex.get(key) ?? []).filter(
      (g) => g.id !== gift.id && g.recipient_member_id !== gift.recipient_member_id
    );
    if (peers.length === 0) return null;
    // Group peers by list label
    const byList = new Map<string, string[]>();
    for (const p of peers) {
      const label =
        p.recipient_member_id == null
          ? "the Home list"
          : p.recipient_member_id === currentMember?.id
          ? "your list"
          : `${members.find((m) => m.id === p.recipient_member_id)?.display_name ?? "someone"}'s list`;
      const arr = byList.get(label) ?? [];
      arr.push(p.name || "Untitled");
      byList.set(label, arr);
    }
    const parts = Array.from(byList.entries()).map(
      ([label, names]) => `${names.slice(0, 3).join(", ")}${names.length > 3 ? "…" : ""} on ${label}`
    );
    return `${gift.store} also has ${parts.join(" and ")} from this store.`;
  };

  const handleCreate = async () => {
    if (!household || !currentMember) return;
    try {
      await newGiftAutosave.flush();
      setShowNewModal(false);
      resetNewForm();
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleCloseNew = async () => {
    try { await newGiftAutosave.flush(); } catch (_) {}
    setShowNewModal(false);
    resetNewForm();
  };

  const openEdit = (gift: Gift) => {
    const initial = {
      name: gift.name ?? "",
      date: gift.gift_date ?? "",
      priority: gift.priority,
      store: gift.store ?? "",
      price: gift.price != null ? String(gift.price) : "",
      color: gift.color_material ?? "",
      size: gift.size ?? "",
      link: gift.link ?? "",
      setName: gift.set_name ?? "",
    };
    giftEditInitialRef.current = initial;
    setEditingGift(gift);
    setEditRecipient(gift.recipient_member_id == null ? HOME_LIST_ID : gift.recipient_member_id);
    setEditName(initial.name);
    setEditDate(initial.date);
    setEditPriority(initial.priority);
    setEditStore(initial.store);
    setEditPrice(initial.price);
    setEditColor(initial.color);
    setEditSize(initial.size);
    setEditLink(initial.link);
    setEditSetName(initial.setName);
  };

  const handleSaveEdit = async () => {
    if (!editingGift || !household) return;
    try {
      await giftEditAutosave.flush();
      setEditingGift(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  const handleCloseEdit = async () => {
    try { await giftEditAutosave.flush(); } catch (_) {}
    setEditingGift(null);
  };

  // Distinct set names already used on a given list (recipient), canonical casing.
  const setNamesForList = (recipientId: string | null): string[] => {
    const seen = new Map<string, string>();
    for (const g of gifts) {
      if (g.recipient_member_id !== recipientId) continue;
      const s = (g.set_name ?? "").trim();
      if (!s) continue;
      const lower = s.toLowerCase();
      if (!seen.has(lower)) seen.set(lower, s);
    }
    return Array.from(seen.values());
  };

  const newListRecipientId =
    newRecipient === HOME_LIST_ID ? null : (newRecipient ?? currentMember?.id ?? null);
  const newSetSuggestions = useMemo(
    () => setNamesForList(newListRecipientId),
    [gifts, newListRecipientId]
  );

  const editListRecipientId = editRecipient === HOME_LIST_ID ? null : (editRecipient || null);
  const editSetSuggestions = useMemo(
    () => setNamesForList(editListRecipientId),
    [gifts, editListRecipientId]
  );

  // Perform the actual list move for the gift being edited.
  const doMoveEditList = async (targetChip: string, scope: "one" | "all") => {
    if (!editingGift || !household) return;
    const target = targetChip === HOME_LIST_ID ? null : targetChip;
    try {
      if (scope === "all") {
        await moveGiftSet.mutateAsync({
          householdId: household.id,
          fromRecipientId: editingGift.recipient_member_id,
          setName: (editingGift.set_name ?? "").trim(),
          toRecipientId: target,
        });
      } else {
        await updateGift.mutateAsync({
          id: editingGift.id,
          householdId: household.id,
          updates: { recipient_member_id: target } as Partial<Gift>,
        });
      }
      setEditRecipient(targetChip);
      setEditingGift((prev) => (prev ? { ...prev, recipient_member_id: target } : prev));
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  // Tapping a list chip in the Edit modal. If the gift belongs to a set (2+ items
  // sharing set_name on its current list), ask whether to move just it or the set.
  const handleEditListChange = (targetChip: string) => {
    if (!editingGift) return;
    const currentChip =
      editingGift.recipient_member_id == null ? HOME_LIST_ID : editingGift.recipient_member_id;
    if (targetChip === currentChip) return;
    const origSet = (editingGift.set_name ?? "").trim();
    const setMembers = origSet
      ? gifts.filter(
          (g) =>
            g.recipient_member_id === editingGift.recipient_member_id &&
            (g.set_name ?? "").trim().toLowerCase() === origSet.toLowerCase()
        )
      : [];
    if (setMembers.length >= 2) {
      const label =
        targetChip === HOME_LIST_ID
          ? "🏠 Home (shared)"
          : members.find((m) => m.id === targetChip)?.display_name ?? "another list";
      setMoveListPrompt({
        targetChip,
        targetLabel: label,
        setName: origSet,
        count: setMembers.length,
      });
    } else {
      doMoveEditList(targetChip, "one");
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

  const handleConfirmSetBought = async (scope: "all" | "one") => {
    if (!setBoughtPrompt || !household || !currentMember) return;
    const p = setBoughtPrompt;
    try {
      if (scope === "all") {
        await markSetBought.mutateAsync({
          householdId: household.id,
          recipientMemberId: p.recipientId,
          setName: p.setName,
          buyerId: currentMember.id,
          bought: p.bought,
        });
      } else {
        await markBought.mutateAsync({
          id: p.gift.id,
          householdId: household.id,
          buyerId: currentMember.id,
          bought: p.bought,
        });
      }
      setSetBoughtPrompt(null);
    } catch (e: any) {
      showAlert("Error", e.message);
    }
  };

  // Per-gift display flags shared by standalone cards and set members.
  const giftCardFlags = (g: Gift) => {
    const isHomeList = g.recipient_member_id == null;
    const viewerIsRecipient = g.recipient_member_id === currentMember?.id;
    const buyer = members.find((m) => m.id === g.bought_by_member_id);
    return {
      isHomeList,
      canSeeBought: isHomeList || !viewerIsRecipient,
      canMarkBought: isHomeList || !viewerIsRecipient,
      buyerName: buyer?.display_name ?? null,
    };
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
    <SafeAreaView className="flex-1 bg-[#BACAFF]" edges={["top"]}>
      <AppHeader compact />
      <View className="px-4 py-3 flex-row items-center">
        <View className="flex-1">
          <Text className="text-xl font-bold text-gray-900">Gifts</Text>
          <Text className="text-xs text-gray-700">
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

      <View className="px-4 pb-1">
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search gifts..."
        />
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

      {/* Filters button */}
      <View className="px-4 pt-2">
        <TouchableOpacity
          onPress={() => setFiltersOpen((v) => !v)}
          className="flex-row items-center self-start gap-2 px-3 py-1.5 rounded-full bg-white border border-gray-300"
        >
          <Text className="text-xs font-semibold text-gray-700">Filters</Text>
          {giftActiveFilterCount > 0 && (
            <View className="bg-blue-600 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
              <Text className="text-white text-[10px] font-bold">{giftActiveFilterCount}</Text>
            </View>
          )}
          <Text className="text-gray-500 text-xs">{filtersOpen ? "˅" : "›"}</Text>
        </TouchableOpacity>
      </View>

      {filtersOpen && (<>
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
          <TouchableOpacity
            onPress={() =>
              setRecipientFilter(recipientFilter === HOME_LIST_ID ? null : HOME_LIST_ID)
            }
            className={`px-3 py-1.5 rounded-full border mr-2 ${
              recipientFilter === HOME_LIST_ID
                ? "bg-emerald-600 border-emerald-600"
                : "bg-white border-gray-200"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                recipientFilter === HOME_LIST_ID ? "text-white" : "text-gray-600"
              }`}
            >
              🏠 Home (shared)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Sort */}
      <View className="px-4 pb-2">
        <View className="flex-row flex-wrap gap-2">
          {([
            { v: "priority", l: "Priority (High → Low)" },
            { v: "price", l: "Price (High → Low)" },
            { v: "date_added", l: "Date Added (Oldest)" },
            { v: "store", l: "Store (A → Z)" },
          ] as const).map((s) => {
            const active = sortMode === s.v;
            return (
              <TouchableOpacity
                key={s.v}
                onPress={() => setSortMode(s.v as SortMode)}
                className={`px-3 py-1.5 rounded-full border ${
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
        </View>
      </View>
      </>)}

      <ScrollView
        contentContainerClassName="px-4 py-4 pb-12"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
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
          renderUnits.map((unit) => {
            // Label shown above a card/set when viewing all lists together.
            const listLabel = (recipientId: string | null) => {
              if (recipientFilter !== null) return null;
              const recipient = members.find((m) => m.id === recipientId);
              return (
                <Text className="text-xs text-gray-700 mb-1 px-1">
                  {recipientId == null
                    ? "For 🏠 Home"
                    : recipient
                    ? `For ${recipient.display_name}${recipient.id === currentMember?.id ? " (You)" : ""}`
                    : ""}
                </Text>
              );
            };

            if (unit.type === "set") {
              return (
                <View key={unit.key} className="mb-3">
                  {listLabel(unit.recipientId)}
                  <View className="rounded-2xl border-2 border-indigo-300 bg-indigo-50 p-2">
                    <View className="px-1 pt-1 pb-2">
                      <Text className="text-sm font-bold text-indigo-900">
                        🎁 Set: {unit.setName}
                      </Text>
                      <Text className="text-xs text-indigo-700 mt-0.5">
                        These {unit.gifts.length} items are part of a set that's meant to be
                        purchased together — buy them all or none.
                      </Text>
                    </View>
                    {unit.gifts.map((g) => {
                      const flags = giftCardFlags(g);
                      return (
                        <GiftCard
                          key={g.id}
                          gift={g}
                          canSeeBought={flags.canSeeBought}
                          canMarkBought={flags.canMarkBought}
                          buyerName={flags.buyerName}
                          storeHint={null}
                          onMarkBought={(gift, bought) =>
                            setSetBoughtPrompt({
                              gift,
                              bought,
                              setName: unit.setName,
                              recipientId: unit.recipientId,
                              count: unit.gifts.length,
                            })
                          }
                          onEdit={openEdit}
                          onDelete={handleDelete}
                        />
                      );
                    })}
                  </View>
                </View>
              );
            }

            const g = unit.gift;
            const flags = giftCardFlags(g);
            return (
              <View key={g.id}>
                {listLabel(g.recipient_member_id ?? null)}
                <GiftCard
                  gift={g}
                  canSeeBought={flags.canSeeBought}
                  canMarkBought={flags.canMarkBought}
                  buyerName={flags.buyerName}
                  storeHint={buildStoreHint(g)}
                  onMarkBought={handleMarkBought}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              </View>
            );
          })
        )}
      </ScrollView>

      {/* ── Gift Set "buy together" prompt ─────────────────────────────────── */}
      <Modal
        visible={!!setBoughtPrompt}
        animationType="fade"
        transparent
        onRequestClose={() => setSetBoughtPrompt(null)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <View className="bg-white rounded-2xl p-5 w-full max-w-[360px]">
            <Text className="text-base font-semibold text-gray-900 mb-1">
              Part of a set of {setBoughtPrompt?.count ?? 0}
            </Text>
            <Text className="text-sm text-gray-500 mb-5">
              "{setBoughtPrompt?.setName}" is a set that's meant to be purchased together. Do you
              want to {setBoughtPrompt?.bought ? "mark the whole set as bought" : "un-mark the whole set"}?
            </Text>
            <TouchableOpacity
              onPress={() => handleConfirmSetBought("all")}
              className="bg-indigo-600 rounded-xl py-3 items-center mb-2"
            >
              <Text className="text-white text-sm font-semibold">
                {setBoughtPrompt?.bought ? "Mark whole set" : "Un-mark whole set"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleConfirmSetBought("one")}
              className="bg-white border border-gray-200 rounded-xl py-3 items-center mb-2"
            >
              <Text className="text-gray-700 text-sm font-semibold">Just this one</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setSetBoughtPrompt(null)} className="py-2 items-center">
              <Text className="text-gray-400 text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── New Gift Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showNewModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNewModal(false)}
      >
        <SafeAreaView className="flex-1 bg-[#BACAFF]">
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
              <TouchableOpacity
                onPress={() => setNewRecipient(HOME_LIST_ID)}
                className={`px-3 py-1.5 rounded-full border ${
                  newRecipient === HOME_LIST_ID
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    newRecipient === HOME_LIST_ID ? "text-white" : "text-gray-700"
                  }`}
                >
                  🏠 Home (shared)
                </Text>
              </TouchableOpacity>
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
              setName_={newSetName} setSetName={setNewSetName}
              setSuggestions={newSetSuggestions}
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
        <SafeAreaView className="flex-1 bg-[#BACAFF]">
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
            <Text className="text-sm font-medium text-gray-700 mb-2">On list</Text>
            <View className="flex-row flex-wrap gap-2 mb-1">
              {members.map((m) => {
                const active = editRecipient === m.id;
                return (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => handleEditListChange(m.id)}
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
              <TouchableOpacity
                onPress={() => handleEditListChange(HOME_LIST_ID)}
                className={`px-3 py-1.5 rounded-full border ${
                  editRecipient === HOME_LIST_ID
                    ? "bg-emerald-600 border-emerald-600"
                    : "bg-white border-gray-200"
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    editRecipient === HOME_LIST_ID ? "text-white" : "text-gray-700"
                  }`}
                >
                  🏠 Home (shared)
                </Text>
              </TouchableOpacity>
            </View>
            <Text className="text-xs text-gray-400 mb-4">
              Move this gift to a different list if it was added to the wrong one.
            </Text>

            <GiftFormFields
              name={editName} setName={setEditName}
              giftDate={editDate} setGiftDate={setEditDate}
              priority={editPriority} setPriority={setEditPriority}
              store={editStore} setStore={setEditStore}
              price={editPrice} setPrice={setEditPrice}
              color={editColor} setColor={setEditColor}
              size={editSize} setSize={setEditSize}
              link={editLink} setLink={setEditLink}
              setName_={editSetName} setSetName={setEditSetName}
              setSuggestions={editSetSuggestions}
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Move-list prompt (gift is part of a set) ───────────────────────── */}
      <Modal
        visible={!!moveListPrompt}
        animationType="fade"
        transparent
        onRequestClose={() => setMoveListPrompt(null)}
      >
        <View className="flex-1 bg-black/40 items-center justify-center px-8">
          <View className="bg-white rounded-2xl p-5 w-full max-w-[360px]">
            <Text className="text-base font-semibold text-gray-900 mb-1">
              Part of a set of {moveListPrompt?.count ?? 0}
            </Text>
            <Text className="text-sm text-gray-500 mb-5">
              "{moveListPrompt?.setName}" is a set. Do you want to move just this item to{" "}
              {moveListPrompt?.targetLabel}, or the whole set?
            </Text>
            <TouchableOpacity
              onPress={() => {
                const p = moveListPrompt;
                setMoveListPrompt(null);
                if (p) doMoveEditList(p.targetChip, "all");
              }}
              className="bg-indigo-600 rounded-xl py-3 items-center mb-2"
            >
              <Text className="text-white text-sm font-semibold">Move whole set</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                const p = moveListPrompt;
                setMoveListPrompt(null);
                if (p) doMoveEditList(p.targetChip, "one");
              }}
              className="bg-white border border-gray-200 rounded-xl py-3 items-center mb-2"
            >
              <Text className="text-gray-700 text-sm font-semibold">Just this item</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMoveListPrompt(null)} className="py-2 items-center">
              <Text className="text-gray-400 text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
