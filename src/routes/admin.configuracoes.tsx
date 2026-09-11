import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminLayout, PanelCard } from "@/components/admin/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/error-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { db } from "@/integrations/meu-supabase/client";
import { friendlyError } from "@/lib/friendly-error";
import type { Tables } from "@/integrations/meu-supabase/types";
import { useAuth } from "@/lib/auth";
import { logAudit } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações — Admin Entrô" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminSettings,
});

type PlatformSettings = Tables<"platform_settings">;
type HomeBanner = Tables<"home_banners">;

function pct(v: number) {
  return (v * 100).toString().replace(".", ",");
}
function parsePct(v: string) {
  return Number(v.replace(",", ".")) / 100;
}
function parseNum(v: string) {
  return Number(v.replace(",", "."));
}
function parseList(v: string) {
  return v
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function useSettings() {
  return useQuery({
    queryKey: ["admin-platform-settings"],
    queryFn: async () => {
      const { data, error } = await db
        .from("platform_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Configurações da plataforma não encontradas.");
      return data as PlatformSettings;
    },
  });
}

function useBanners() {
  return useQuery({
    queryKey: ["admin-home-banners"],
    queryFn: async () => {
      const { data, error } = await db
        .from("home_banners")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as HomeBanner[];
    },
  });
}

function AdminSettings() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const settingsQuery = useSettings();
  const bannersQuery = useBanners();
  const [saving, setSaving] = useState(false);
  const [sendingTestEmail, setSendingTestEmail] = useState(false);

  const [form, setForm] = useState({
    pixFee: "",
    pixMin: "",
    cardFee: "",
    cardMin: "",
    advanceFee: "",
    anticipationMargin: "",
    holdPercent: "",
    holdDays: "",
    payoutHours: "",
    pixAdvanceLimit: "",
    cancelFee: "",
    termsVersion: "",
    genres: "",
    cities: "",
  });

  useEffect(() => {
    const s = settingsQuery.data;
    if (!s) return;
    setForm({
      pixFee: pct(s.fee_pix_percent),
      pixMin: String(s.fee_pix_min),
      cardFee: pct(s.fee_card_percent),
      cardMin: String(s.fee_card_min),
      advanceFee: pct(s.advance_fee_percent),
      anticipationMargin: pct(s.anticipation_margin_percent),
      holdPercent: pct(s.retention_percent),
      holdDays: String(s.retention_days),
      payoutHours: String(s.payout_business_hours),
      pixAdvanceLimit: pct(s.pix_advance_limit_percent),
      cancelFee: pct(s.cancellation_fee_percent),
      termsVersion: s.producer_terms_version,
      genres: (s.genres ?? []).join(", "),
      cities: (s.cities ?? []).join(", "),
    });
  }, [settingsQuery.data]);

  const saveSettings = async () => {
    setSaving(true);
    try {
      const patch = {
        fee_pix_percent: parsePct(form.pixFee),
        fee_pix_min: parseNum(form.pixMin),
        fee_card_percent: parsePct(form.cardFee),
        fee_card_min: parseNum(form.cardMin),
        advance_fee_percent: parsePct(form.advanceFee),
        anticipation_margin_percent: parsePct(form.anticipationMargin),
        retention_percent: parsePct(form.holdPercent),
        retention_days: Number(form.holdDays),
        payout_business_hours: Number(form.payoutHours),
        pix_advance_limit_percent: parsePct(form.pixAdvanceLimit),
        cancellation_fee_percent: parsePct(form.cancelFee),
        producer_terms_version: form.termsVersion.trim(),
        genres: parseList(form.genres),
        cities: parseList(form.cities),
        updated_by: user?.id ?? null,
        updated_at: new Date().toISOString(),
      };
      const { error } = await db.from("platform_settings").update(patch).eq("id", 1);
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "update_platform_settings",
        entity: "platform_settings",
        entityId: "1",
        details: patch,
      });
      toast.success("Configurações salvas.");
      qc.invalidateQueries({ queryKey: ["admin-platform-settings"] });
    } catch (e) {
      toast.error(friendlyError(e as { message?: string }, "Não foi possível salvar as configurações."));
    } finally {
      setSaving(false);
    }
  };

  const sendTestEmail = async () => {
    setSendingTestEmail(true);
    try {
      const { data, error } = await db.functions.invoke("send-test-email");
      if (error) throw error;
      toast.success(`E-mail de teste enviado. Resposta do Resend: ${JSON.stringify(data)}`);
    } catch (e) {
      toast.error(friendlyError(e as { message?: string }, "Não foi possível enviar o e-mail de teste."));
    } finally {
      setSendingTestEmail(false);
    }
  };

  const toggleBanner = async (banner: HomeBanner) => {
    try {
      const { error } = await db
        .from("home_banners")
        .update({ is_active: !banner.is_active })
        .eq("id", banner.id);
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: banner.is_active ? "deactivate_home_banner" : "activate_home_banner",
        entity: "home_banners",
        entityId: banner.id,
      });
      qc.invalidateQueries({ queryKey: ["admin-home-banners"] });
    } catch (e) {
      toast.error(friendlyError(e as { message?: string }, "Não foi possível atualizar o banner."));
    }
  };

  const moveBanner = async (banner: HomeBanner, direction: -1 | 1) => {
    const banners = bannersQuery.data ?? [];
    const idx = banners.findIndex((b) => b.id === banner.id);
    const swapWith = banners[idx + direction];
    if (!swapWith) return;
    try {
      const [r1, r2] = await Promise.all([
        db.from("home_banners").update({ sort_order: swapWith.sort_order }).eq("id", banner.id),
        db.from("home_banners").update({ sort_order: banner.sort_order }).eq("id", swapWith.id),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "reorder_home_banner",
        entity: "home_banners",
        entityId: banner.id,
        details: { swappedWith: swapWith.id },
      });
      qc.invalidateQueries({ queryKey: ["admin-home-banners"] });
    } catch (e) {
      toast.error(friendlyError(e as { message?: string }, "Não foi possível reordenar os banners."));
    }
  };

  const deleteBanner = async (banner: HomeBanner) => {
    try {
      const { error } = await db.from("home_banners").delete().eq("id", banner.id);
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "delete_home_banner",
        entity: "home_banners",
        entityId: banner.id,
      });
      toast.success("Banner excluído.");
      qc.invalidateQueries({ queryKey: ["admin-home-banners"] });
    } catch (e) {
      toast.error(friendlyError(e as { message?: string }, "Não foi possível excluir o banner."));
    }
  };

  const uploadBanner = async (file: File, device: Tables<"home_banners">["device"]) => {
    try {
      const bucket = "home-banners";
      const path = `${device}/${Date.now()}-${file.name}`;
      const { error: uploadError } = await db.storage
        .from(bucket)
        .upload(path, file, { upsert: true, cacheControl: "3600" });
      if (uploadError) {
        throw new Error(
          /bucket/i.test(uploadError.message)
            ? `O espaço de armazenamento "${bucket}" ainda não foi configurado no projeto. Fale com o suporte.`
            : uploadError.message,
        );
      }
      const { data: pub } = db.storage.from(bucket).getPublicUrl(path);
      const banners = bannersQuery.data ?? [];
      const nextOrder = banners.length > 0 ? Math.max(...banners.map((b) => b.sort_order)) + 1 : 0;
      const { data: inserted, error } = await db
        .from("home_banners")
        .insert({ device, image_url: pub.publicUrl, is_active: true, sort_order: nextOrder })
        .select()
        .single();
      if (error) throw error;
      await logAudit({
        actorId: user?.id ?? null,
        action: "create_home_banner",
        entity: "home_banners",
        entityId: inserted.id,
        details: { device, image_url: pub.publicUrl },
      });
      toast.success("Banner enviado.");
      qc.invalidateQueries({ queryKey: ["admin-home-banners"] });
    } catch (e) {
      toast.error(friendlyError(e as { message?: string }, "Não foi possível enviar o banner."));
    }
  };

  return (
    <AdminLayout title="Configurações" description="Taxas, filtros e banners da plataforma.">
      {settingsQuery.isError ? (
        <ErrorState
          description="Não conseguimos carregar as configurações."
          onRetry={() => settingsQuery.refetch()}
        />
      ) : settingsQuery.isLoading || !settingsQuery.data ? (
        <Skeleton className="h-64 w-full rounded-xl" />
      ) : (
        <PanelCard title="Taxas e regras">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="pix-fee">Taxa Pix (%)</Label>
              <Input
                id="pix-fee"
                value={form.pixFee}
                onChange={(e) => setForm((f) => ({ ...f, pixFee: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="pix-min">Taxa Pix mínima (R$)</Label>
              <Input
                id="pix-min"
                value={form.pixMin}
                onChange={(e) => setForm((f) => ({ ...f, pixMin: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="card-fee">Taxa cartão (%)</Label>
              <Input
                id="card-fee"
                value={form.cardFee}
                onChange={(e) => setForm((f) => ({ ...f, cardFee: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="card-min">Taxa cartão mínima (R$)</Label>
              <Input
                id="card-min"
                value={form.cardMin}
                onChange={(e) => setForm((f) => ({ ...f, cardMin: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="advance-fee">Taxa de adiantamento (%)</Label>
              <Input
                id="advance-fee"
                value={form.advanceFee}
                onChange={(e) => setForm((f) => ({ ...f, advanceFee: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="anticipation-margin">Margem de antecipação (%)</Label>
              <Input
                id="anticipation-margin"
                value={form.anticipationMargin}
                onChange={(e) => setForm((f) => ({ ...f, anticipationMargin: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="hold-percent">Retenção por evento (%)</Label>
              <Input
                id="hold-percent"
                value={form.holdPercent}
                onChange={(e) => setForm((f) => ({ ...f, holdPercent: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="hold-days">Retenção — dias até liberação</Label>
              <Input
                id="hold-days"
                value={form.holdDays}
                onChange={(e) => setForm((f) => ({ ...f, holdDays: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="payout-hours">Repasse (horas úteis)</Label>
              <Input
                id="payout-hours"
                value={form.payoutHours}
                onChange={(e) => setForm((f) => ({ ...f, payoutHours: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="pix-advance-limit">Limite de adiantamento do Pix (%)</Label>
              <Input
                id="pix-advance-limit"
                value={form.pixAdvanceLimit}
                onChange={(e) => setForm((f) => ({ ...f, pixAdvanceLimit: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="cancel-fee">Taxa de cancelamento (%)</Label>
              <Input
                id="cancel-fee"
                value={form.cancelFee}
                onChange={(e) => setForm((f) => ({ ...f, cancelFee: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="terms-version">Versão dos termos do produtor</Label>
              <Input
                id="terms-version"
                value={form.termsVersion}
                onChange={(e) => setForm((f) => ({ ...f, termsVersion: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="cities-list">Cidades (separadas por vírgula)</Label>
              <Input
                id="cities-list"
                value={form.cities}
                onChange={(e) => setForm((f) => ({ ...f, cities: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="genres-list">Gêneros (separados por vírgula)</Label>
              <Input
                id="genres-list"
                value={form.genres}
                onChange={(e) => setForm((f) => ({ ...f, genres: e.target.value }))}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Novas taxas valem só para eventos criados a partir de agora.
          </p>
          <Button className="mt-3" disabled={saving} onClick={saveSettings}>
            {saving ? "Salvando…" : "Salvar configurações"}
          </Button>
        </PanelCard>
      )}

      <PanelCard title="E-mail de teste" className="mt-5">
        <p className="text-sm text-muted-foreground">
          Envia um e-mail de teste através do Resend para validar a configuração de disparo.
        </p>
        <Button
          className="mt-3"
          variant="outline"
          disabled={sendingTestEmail}
          onClick={sendTestEmail}
        >
          {sendingTestEmail ? "Enviando…" : "Enviar e-mail de teste"}
        </Button>
      </PanelCard>

      {settingsQuery.data ? (
        <PanelCard title="Filtros do site (visualização)" className="mt-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-bold">Cidades</p>
              <div className="flex flex-wrap gap-1">
                {(settingsQuery.data.cities ?? []).map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-bold">Gêneros</p>
              <div className="flex flex-wrap gap-1">
                {(settingsQuery.data.genres ?? []).map((g) => (
                  <Badge key={g} variant="secondary">
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </PanelCard>
      ) : null}

      <PanelCard title="Banners da home" className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="banner-desktop">Enviar banner desktop</Label>
            <Input
              id="banner-desktop"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadBanner(file, "desktop");
                e.target.value = "";
              }}
            />
          </div>
          <div>
            <Label htmlFor="banner-mobile">Enviar banner mobile</Label>
            <Input
              id="banner-mobile"
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadBanner(file, "mobile");
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {bannersQuery.isError ? (
          <ErrorState
            description="Não conseguimos carregar os banners."
            onRetry={() => bannersQuery.refetch()}
          />
        ) : bannersQuery.isLoading || !bannersQuery.data ? (
          <div className="mt-4 space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {bannersQuery.data.map((banner, idx) => (
              <div
                key={banner.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={banner.image_url}
                    alt=""
                    className="h-14 w-24 rounded-lg object-cover"
                  />
                  <div>
                    <p className="text-sm font-bold capitalize">{banner.device}</p>
                    <p className="text-xs text-muted-foreground">Ordem: {banner.sort_order}</p>
                  </div>
                  <Badge variant={banner.is_active ? "default" : "secondary"}>
                    {banner.is_active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={idx === 0}
                    onClick={() => moveBanner(banner, -1)}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={idx === bannersQuery.data.length - 1}
                    onClick={() => moveBanner(banner, 1)}
                  >
                    ↓
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => toggleBanner(banner)}>
                    {banner.is_active ? "Desativar" : "Ativar"}
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteBanner(banner)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
            {bannersQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum banner cadastrado ainda.</p>
            ) : null}
          </div>
        )}
      </PanelCard>
    </AdminLayout>
  );
}
