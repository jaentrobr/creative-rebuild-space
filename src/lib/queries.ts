import { db } from "@/integrations/meu-supabase/client";
import type { Tables } from "@/integrations/meu-supabase/types";

export type EventRow = Tables<"events">;
export type LotRow = Tables<"lots">;
export type TicketTypeRow = Tables<"ticket_types">;

export type PublicEvent = EventRow & {
  producers: Pick<Tables<"producers">, "id" | "display_name" | "logo_url"> | null;
  lots?: LotRow[];
};

const EVENT_SELECT = "*, producers(id, display_name, logo_url)";

export async function fetchPublishedEvents(): Promise<PublicEvent[]> {
  const { data, error } = await db
    .from("events")
    .select(`${EVENT_SELECT}, lots(*)`)
    .eq("status", "published")
    .eq("visibility", "public")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as PublicEvent[];
}

export async function fetchEventBySlug(slug: string): Promise<PublicEvent | null> {
  const { data, error } = await db
    .from("events")
    .select(`${EVENT_SELECT}, ticket_types(*), lots(*)`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as PublicEvent | null;
}

export async function fetchHomeBanners(device: "desktop" | "mobile") {
  const { data, error } = await db
    .from("home_banners")
    .select("*")
    .eq("device", device)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlatformSettings() {
  const { data, error } = await db.from("platform_settings").select("*").eq("id", 1).maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Menor preço disponível entre os lotes de um evento. */
export function lowestPrice(lots: LotRow[] | undefined | null): number | null {
  const available = (lots ?? []).filter((lot) => lot.quantity - lot.sold_count > 0);
  const pool = available.length > 0 ? available : (lots ?? []);
  if (pool.length === 0) return null;
  return Math.min(...pool.map((lot) => Number(lot.price)));
}

export function lotStatus(lot: LotRow): "available" | "soldout" | "soon" | "closed" {
  const now = Date.now();
  if (lot.sales_start_at && new Date(lot.sales_start_at).getTime() > now) return "soon";
  if (lot.sales_end_at && new Date(lot.sales_end_at).getTime() < now) return "closed";
  if (lot.quantity - lot.sold_count <= 0) return "soldout";
  return "available";
}
