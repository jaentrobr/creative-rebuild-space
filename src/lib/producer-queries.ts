import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { db } from "@/integrations/meu-supabase/client";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/meu-supabase/types";
import { useAuth } from "@/lib/auth";

export type ProducerRow = Tables<"producers">;
export type EventRow = Tables<"events">;
export type TicketTypeRow = Tables<"ticket_types">;
export type LotRow = Tables<"lots">;
export type CouponRow = Tables<"coupons">;
export type PromoterRow = Tables<"promoters">;
export type EventStaffRow = Tables<"event_staff">;
export type ProducerPrivateRow = Tables<"producer_private">;
export type TermsAcceptanceRow = Tables<"terms_acceptances">;
export type PlatformSettingsRow = Tables<"platform_settings">;
export type PayoutRow = Tables<"payouts">;
export type AdvanceRow = Tables<"advances">;
export type RefundRow = Tables<"refunds">;

/* ------------------------------ produtora ------------------------------ */

export function useBecomeProducer() {
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: async (displayName: string) => {
      const { data, error } = await db.rpc("become_producer", { p_display_name: displayName });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refresh();
    },
  });
}

export function useUpdateProducer(producerId: string | undefined) {
  const queryClient = useQueryClient();
  const { refresh } = useAuth();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"producers">) => {
      if (!producerId) throw new Error("Produtora não encontrada.");
      const { data, error } = await db
        .from("producers")
        .update(patch)
        .eq("id", producerId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await refresh();
      await queryClient.invalidateQueries({ queryKey: ["producer"] });
    },
  });
}

/** Upload de arquivo em bucket do Storage. Se o bucket não existir no projeto, o erro é repassado com mensagem clara. */
async function uploadToBucket(bucket: string, path: string, file: File) {
  const { error } = await db.storage
    .from(bucket)
    .upload(path, file, { upsert: true, cacheControl: "3600" });
  if (error) {
    throw new Error(
      /bucket/i.test(error.message)
        ? `O espaço de armazenamento "${bucket}" ainda não foi configurado no projeto. Fale com o suporte.`
        : error.message,
    );
  }
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export function useUploadProducerLogo(producerId: string | undefined) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!producerId) throw new Error("Produtora não encontrada.");
      const ext = file.name.split(".").pop() ?? "jpg";
      return uploadToBucket("producer-logos", `${producerId}/logo-${Date.now()}.${ext}`, file);
    },
  });
}

export function useUploadEventBanner(eventId: string | undefined) {
  return useMutation({
    mutationFn: async (file: File) => {
      if (!eventId) throw new Error("Salve o evento antes de enviar o banner.");
      const ext = file.name.split(".").pop() ?? "jpg";
      return uploadToBucket("event-banners", `${eventId}/banner-${Date.now()}.${ext}`, file);
    },
  });
}

/* ------------------------------- eventos -------------------------------- */

export function useProducerEvents(producerId: string | undefined) {
  return useQuery({
    queryKey: ["producer-events", producerId],
    queryFn: async () => {
      const { data, error } = await db
        .from("events")
        .select("*")
        .eq("producer_id", producerId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EventRow[];
    },
    enabled: !!producerId,
  });
}

export function useEvent(eventId: string | undefined) {
  return useQuery({
    queryKey: ["producer-event", eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from("events")
        .select("*")
        .eq("id", eventId as string)
        .maybeSingle();
      if (error) throw error;
      return data as EventRow | null;
    },
    enabled: !!eventId,
  });
}

export function useEventTicketTypes(eventId: string | undefined) {
  return useQuery({
    queryKey: ["producer-event-ticket-types", eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from("ticket_types")
        .select("*, lots(*)")
        .eq("event_id", eventId as string)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data as unknown as (TicketTypeRow & { lots: LotRow[] })[];
    },
    enabled: !!eventId,
  });
}

function slugify(title: string) {
  return (
    title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "evento"
  );
}

/** Gera um slug único checando colisões na tabela events. */
async function generateUniqueSlug(title: string, ignoreEventId?: string) {
  const base = slugify(title);
  let candidate = base;
  for (let attempt = 0; attempt < 30; attempt++) {
    let query = db.from("events").select("id").eq("slug", candidate).limit(1);
    if (ignoreEventId) query = query.neq("id", ignoreEventId);
    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return candidate;
    candidate = `${base}-${Math.random().toString(36).slice(2, 6)}`;
  }
  return `${base}-${Date.now()}`;
}

export function useCreateEvent(producerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: Omit<TablesInsert<"events">, "producer_id" | "slug"> & { title: string },
    ) => {
      if (!producerId) throw new Error("Produtora não encontrada.");
      const slug = await generateUniqueSlug(input.title);
      const { data, error } = await db
        .from("events")
        .insert({ ...input, producer_id: producerId, slug })
        .select()
        .single();
      if (error) throw error;
      return data as EventRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producer-events", producerId] });
    },
  });
}

export function useUpdateEvent(eventId: string | undefined, producerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: TablesUpdate<"events"> & { regenerateSlugFrom?: string }) => {
      if (!eventId) throw new Error("Evento não encontrado.");
      const { regenerateSlugFrom, ...rest } = patch;
      const finalPatch: TablesUpdate<"events"> = { ...rest };
      if (regenerateSlugFrom)
        finalPatch.slug = await generateUniqueSlug(regenerateSlugFrom, eventId);
      const { data, error } = await db
        .from("events")
        .update(finalPatch)
        .eq("id", eventId)
        .select()
        .single();
      if (error) throw error;
      return data as EventRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producer-event", eventId] });
      await queryClient.invalidateQueries({ queryKey: ["producer-events", producerId] });
    },
  });
}

export function useTicketTypeMutations(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["producer-event-ticket-types", eventId] });

  const createTicketType = useMutation({
    mutationFn: async (input: Omit<TablesInsert<"ticket_types">, "event_id">) => {
      if (!eventId) throw new Error("Salve as informações do evento antes de criar ingressos.");
      const { data, error } = await db
        .from("ticket_types")
        .insert({ ...input, event_id: eventId })
        .select()
        .single();
      if (error) throw error;
      return data as TicketTypeRow;
    },
    onSuccess: invalidate,
  });

  const updateTicketType = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"ticket_types"> }) => {
      const { data, error } = await db
        .from("ticket_types")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TicketTypeRow;
    },
    onSuccess: invalidate,
  });

  const deleteTicketType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("ticket_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const createLot = useMutation({
    mutationFn: async (input: TablesInsert<"lots">) => {
      const { data, error } = await db.from("lots").insert(input).select().single();
      if (error) throw error;
      return data as LotRow;
    },
    onSuccess: invalidate,
  });

  const updateLot = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: TablesUpdate<"lots"> }) => {
      const { data, error } = await db.from("lots").update(patch).eq("id", id).select().single();
      if (error) throw error;
      return data as LotRow;
    },
    onSuccess: invalidate,
  });

  const deleteLot = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from("lots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return { createTicketType, updateTicketType, deleteTicketType, createLot, updateLot, deleteLot };
}

/* --------------------------- termos do produtor -------------------------- */

export function usePlatformSettings() {
  return useQuery({
    queryKey: ["platform-settings"],
    queryFn: async () => {
      const { data, error } = await db
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      return data as PlatformSettingsRow | null;
    },
  });
}

export function useProducerTermsAcceptance(userId: string | undefined) {
  return useQuery({
    queryKey: ["producer-terms-acceptance", userId],
    queryFn: async () => {
      const { data, error } = await db
        .from("terms_acceptances")
        .select("*")
        .eq("user_id", userId as string)
        .eq("document", "producer_terms")
        .order("accepted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data as TermsAcceptanceRow | null;
    },
    enabled: !!userId,
  });
}

export function useAcceptProducerTerms(userId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (version: string) => {
      if (!userId) throw new Error("Faça login novamente.");
      const { data, error } = await db
        .from("terms_acceptances")
        .insert({
          user_id: userId,
          document: "producer_terms",
          version,
          user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        })
        .select()
        .single();
      if (error) throw error;
      return data as TermsAcceptanceRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producer-terms-acceptance", userId] });
    },
  });
}

/* ------------------------------ verificação ------------------------------ */

export function useProducerPrivate(producerId: string | undefined) {
  return useQuery({
    queryKey: ["producer-private", producerId],
    queryFn: async () => {
      const { data, error } = await db
        .from("producer_private")
        .select("*")
        .eq("producer_id", producerId as string)
        .maybeSingle();
      if (error) throw error;
      return data as ProducerPrivateRow | null;
    },
    enabled: !!producerId,
  });
}

export function useUpsertProducerPrivate(producerId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Omit<TablesInsert<"producer_private">, "producer_id">) => {
      if (!producerId) throw new Error("Produtora não encontrada.");
      const { data, error } = await db
        .from("producer_private")
        .upsert({ ...patch, producer_id: producerId }, { onConflict: "producer_id" })
        .select()
        .single();
      if (error) throw error;
      return data as ProducerPrivateRow;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["producer-private", producerId] });
    },
  });
}

/* -------------------------- cupons e divulgadores ------------------------- */

export function useCoupons(eventId: string | undefined) {
  return useQuery({
    queryKey: ["producer-coupons", eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from("coupons")
        .select("*")
        .eq("event_id", eventId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CouponRow[];
    },
    enabled: !!eventId,
  });
}

export function useCouponMutations(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["producer-coupons", eventId] });
  const create = useMutation({
    mutationFn: async (input: Omit<TablesInsert<"coupons">, "event_id">) => {
      if (!eventId) throw new Error("Evento não encontrado.");
      const { data, error } = await db
        .from("coupons")
        .insert({ ...input, event_id: eventId })
        .select()
        .single();
      if (error) throw error;
      return data as CouponRow;
    },
    onSuccess: invalidate,
  });
  const toggle = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await db.from("coupons").update({ is_active: isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { create, toggle };
}

export function usePromoters(eventId: string | undefined) {
  return useQuery({
    queryKey: ["producer-promoters", eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from("promoters")
        .select("*")
        .eq("event_id", eventId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PromoterRow[];
    },
    enabled: !!eventId,
  });
}

export function usePromoterMutations(eventId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["producer-promoters", eventId] });
  const create = useMutation({
    mutationFn: async (input: Omit<TablesInsert<"promoters">, "event_id">) => {
      if (!eventId) throw new Error("Evento não encontrado.");
      const { data, error } = await db
        .from("promoters")
        .insert({ ...input, event_id: eventId })
        .select()
        .single();
      if (error) throw error;
      return data as PromoterRow;
    },
    onSuccess: invalidate,
  });
  const markCommissionPaid = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db
        .from("promoters")
        .update({ commission_paid_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
  return { create, markCommissionPaid };
}

export function useEventStaff(eventId: string | undefined) {
  return useQuery({
    queryKey: ["producer-event-staff", eventId],
    queryFn: async () => {
      const { data, error } = await db
        .from("event_staff")
        .select("*")
        .eq("event_id", eventId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as EventStaffRow[];
    },
    enabled: !!eventId,
  });
}

/** Participantes reais do evento via RPC (respeita RLS/permissão de dono). */
export function useEventParticipants(eventId: string | undefined) {
  return useQuery({
    queryKey: ["producer-event-participants", eventId],
    queryFn: async () => {
      const { data, error } = await db.rpc("get_event_participants", {
        p_event_id: eventId as string,
      });
      if (error) throw error;
      return (Array.isArray(data) ? data : []) as Record<string, unknown>[];
    },
    enabled: !!eventId,
  });
}

/* -------------------------------- financeiro ------------------------------ */

export function usePayouts(producerId: string | undefined) {
  return useQuery({
    queryKey: ["producer-payouts", producerId],
    queryFn: async () => {
      const { data, error } = await db
        .from("payouts")
        .select("*")
        .eq("producer_id", producerId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PayoutRow[];
    },
    enabled: !!producerId,
  });
}

export function useAdvances(producerId: string | undefined) {
  return useQuery({
    queryKey: ["producer-advances", producerId],
    queryFn: async () => {
      const { data, error } = await db
        .from("advances")
        .select("*")
        .eq("producer_id", producerId as string)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as AdvanceRow[];
    },
    enabled: !!producerId,
  });
}

export function useProducerRefunds(eventIds: string[]) {
  return useQuery({
    queryKey: ["producer-refunds", eventIds],
    queryFn: async () => {
      if (eventIds.length === 0) return [] as RefundRow[];
      const { data, error } = await db
        .from("refunds")
        .select("*")
        .in("event_id", eventIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as RefundRow[];
    },
    enabled: eventIds.length > 0,
  });
}
