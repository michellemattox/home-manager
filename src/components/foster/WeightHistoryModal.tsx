import React, { useMemo } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView } from "react-native";
import { useFosterWeightLogs } from "@/hooks/useFosterPuppy";
import { WeighInList } from "./WeighInList";
import { summarizeGrowth, growthHeadline } from "@/utils/puppyGrowth";
import type { FosterPuppy } from "@/types/app.types";

interface WeightHistoryModalProps {
  visible: boolean;
  puppy: FosterPuppy;
  onClose: () => void;
}

/**
 * The full weigh-in history for one puppy. Every entry is editable in place and
 * deletable via WeighInList — the same list the Log Weigh-In dialog renders, so
 * corrections work identically wherever you find the entry.
 */
export function WeightHistoryModal({ visible, puppy, onClose }: WeightHistoryModalProps) {
  const { data: weightLogs = [] } = useFosterWeightLogs(puppy.id);
  const growth = useMemo(() => summarizeGrowth(weightLogs), [weightLogs]);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View className="flex-1 bg-black/40 items-center justify-center px-5">
        <View className="bg-white rounded-2xl w-full max-w-[420px] overflow-hidden">
          <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
            <Text style={{ fontSize: 20 }} className="mr-2">⚖️</Text>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900">
                {puppy.name} · Weigh-Ins
              </Text>
              <Text className="text-xs text-gray-500">{growth.entries.length} logged</Text>
            </View>
            <TouchableOpacity onPress={onClose} className="ml-3 px-1">
              <Text className="text-gray-400 text-xl">✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView className="max-h-[520px]" keyboardShouldPersistTaps="handled">
            <View className="p-4">
              <View
                className={`rounded-xl px-3 py-3 mb-4 ${
                  growth.sinceLast?.flagged ? "bg-red-50" : "bg-emerald-50"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    growth.sinceLast?.flagged ? "text-red-700" : "text-emerald-800"
                  }`}
                >
                  {growthHeadline(growth, puppy)}
                </Text>
              </View>

              <WeighInList puppy={puppy} growth={growth} />
            </View>
          </ScrollView>

          <View className="border-t border-gray-100 px-4 py-3">
            <TouchableOpacity
              onPress={onClose}
              className="rounded-xl py-3 items-center bg-gray-900"
            >
              <Text className="text-white text-sm font-bold">Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
