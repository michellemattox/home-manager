import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useHouseholdStore } from "@/stores/householdStore";
import type { Household, HouseholdMember } from "@/types/app.types";

export function useHousehold(householdId: string | undefined) {
  return useQuery({
    queryKey: ["household", householdId],
    queryFn: async () => {
      if (!householdId) return null;
      const { data, error } = await supabase
        .from("households")
        .select("*")
        .eq("id", householdId)
        .single();
      if (error) throw error;
      return data as Household;
    },
    enabled: !!householdId,
  });
}

export function useHouseholdMembers(householdId: string | undefined) {
  return useQuery({
    queryKey: ["household_members", householdId],
    queryFn: async () => {
      if (!householdId) return [];
      const { data, error } = await supabase
        .from("household_members")
        .select("*")
        .eq("household_id", householdId)
        .order("joined_at");
      if (error) throw error;
      return (data ?? []) as HouseholdMember[];
    },
    enabled: !!householdId,
  });
}

export function useCreateHousehold() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      zipCode,
      userId,
      displayName,
    }: {
      name: string;
      zipCode: string;
      userId: string;
      displayName: string;
    }) => {
      const { data, error } = await supabase.rpc("create_household_with_member", {
        p_name: name,
        p_zip_code: zipCode,
        p_user_id: userId,
        p_display_name: displayName,
      });
      if (error) throw error;
      return data as Household;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["household"] }),
  });
}

export function useGenerateInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (householdId: string) => {
      const token = Math.random().toString(36).slice(2, 10);
      const { error } = await supabase
        .from("household_members")
        .insert({
          household_id: householdId,
          user_id: "pending",
          display_name: "Invited",
          role: "member",
          color_hex: "#9333ea",
          invite_token: token,
        });
      if (error) throw error;
      return token;
    },
    onSuccess: (_, householdId) =>
      qc.invalidateQueries({ queryKey: ["household_members", householdId] }),
  });
}

export function useAcceptInvite() {
  return useMutation({
    mutationFn: async ({
      token,
      userId,
      displayName,
    }: {
      token: string;
      userId: string;
      displayName: string;
    }) => {
      const { data, error } = await supabase
        .from("household_members")
        .update({ user_id: userId, display_name: displayName })
        .eq("invite_token", token)
        .select()
        .single();
      if (error) throw error;
      return data as HouseholdMember;
    },
  });
}
