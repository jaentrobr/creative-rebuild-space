import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AdminLayout, PanelCard } from "@/components/admin/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cities, genres, type FeeSettings } from "@/data/admin";
import { adminActions, useAdmin } from "@/lib/admin-store";

export const Route = createFileRoute("/admin/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Admin Entrô" }, { name: "robots", content: "noindex, nofollow" }] }),
  component: AdminSettings,
});

function pct(v: number) {
  return (v * 100).toString().replace(".", ",");
}
function parsePct(v: string) {
  return Number(v.replace(",", ".")) / 100;
}

function AdminSettings() {
  const { fees } = useAdmin();
  const [form, setForm] = useState({
    pixFee: pct(fees.pixFee),
    pixMin: String(fees.pixMin),
    cardFee: pct(fees.cardFee),
    cardMin: String(fees.cardMin),
    advanceFee: pct(fees.advanceFee),
    anticipationMargin: pct(fees.anticipationMargin),
    holdPercent: pct(fees.holdPercent),
    holdDays: String(fees.holdDays),
    payoutHours: String(fees.payoutHours),
    pixAdvanceLimit: pct(fees.pixAdvanceLimit),
    cancelFee: pct(fees.cancelFee),
  });
  const [desktopBanner, setDesktopBanner] = useState("");
  const [mobileBanner, setMobileBanner] = useState("");

  const saveFees = () => {
    const patch: Partial<FeeSettings> = {
      pixFee: parsePct(form.pixFee),
      pixMin: Number(form.pixMin.replace(",", ".")),
      cardFee: parsePct(form.cardFee),
      cardMin: Number(form.cardMin.replace(",", ".")),
      advanceFee: parsePct(form.advanceFee),
      anticipationMargin: parsePct(form.anticipationMargin),
      holdPercent: parsePct(form.holdPercent),
      holdDays: Number(form.holdDays),
      payoutHours: Number(form.payoutHours),
      pixAdvanceLimit: parsePct(form.pixAdvanceLimit),
      cancelFee: parsePct(form.cancelFee),
    };
    adminActions.updateFees(patch);
    toast.success("Novas taxas valem só para eventos criados a partir de agora.");
  };

  return (
    <AdminLayout title="Configurações" description="Taxas, filtros e banners da plataforma.">
      <PanelCard title="Taxas">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="pix-fee">Taxa Pix (%)</Label>
            <Input id="pix-fee" value={form.pixFee} onChange={(e) => setForm((f) => ({ ...f, pixFee: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="pix-min">Taxa Pix mínima (R$)</Label>
            <Input id="pix-min" value={form.pixMin} onChange={(e) => setForm((f) => ({ ...f, pixMin: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="card-fee">Taxa cartão (%)</Label>
            <Input id="card-fee" value={form.cardFee} onChange={(e) => setForm((f) => ({ ...f, cardFee: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="card-min">Taxa cartão mínima (R$)</Label>
            <Input id="card-min" value={form.cardMin} onChange={(e) => setForm((f) => ({ ...f, cardMin: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="advance-fee">Taxa de adiantamento (%)</Label>
            <Input id="advance-fee" value={form.advanceFee} onChange={(e) => setForm((f) => ({ ...f, advanceFee: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="anticipation-margin">Margem de antecipação (%)</Label>
            <Input id="anticipation-margin" value={form.anticipationMargin} onChange={(e) => setForm((f) => ({ ...f, anticipationMargin: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="hold-percent">Retenção por evento (%)</Label>
            <Input id="hold-percent" value={form.holdPercent} onChange={(e) => setForm((f) => ({ ...f, holdPercent: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="hold-days">Retenção — dias até liberação</Label>
            <Input id="hold-days" value={form.holdDays} onChange={(e) => setForm((f) => ({ ...f, holdDays: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="payout-hours">Repasse (horas úteis)</Label>
            <Input id="payout-hours" value={form.payoutHours} onChange={(e) => setForm((f) => ({ ...f, payoutHours: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="pix-advance-limit">Limite de adiantamento do Pix (%)</Label>
            <Input id="pix-advance-limit" value={form.pixAdvanceLimit} onChange={(e) => setForm((f) => ({ ...f, pixAdvanceLimit: e.target.value }))} />
          </div>
          <div>
            <Label htmlFor="cancel-fee">Taxa de cancelamento (%)</Label>
            <Input id="cancel-fee" value={form.cancelFee} onChange={(e) => setForm((f) => ({ ...f, cancelFee: e.target.value }))} />
          </div>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">Novas taxas valem só para eventos criados a partir de agora.</p>
        <Button className="mt-3" onClick={saveFees}>Salvar taxas</Button>
      </PanelCard>

      <PanelCard title="Filtros do site" className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-bold">Cidades</p>
            <div className="flex flex-wrap gap-1">
              {cities.map((c) => <Badge key={c} variant="secondary">{c}</Badge>)}
            </div>
          </div>
          <div>
            <p className="mb-2 text-sm font-bold">Gêneros</p>
            <div className="flex flex-wrap gap-1">
              {genres.map((g) => <Badge key={g} variant="secondary">{g}</Badge>)}
            </div>
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Banners da home" className="mt-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="banner-desktop">Banner desktop</Label>
            <Input id="banner-desktop" type="file" accept="image/*" onChange={(e) => setDesktopBanner(e.target.files?.[0]?.name ?? "")} />
            {desktopBanner ? <p className="mt-1 text-xs text-muted-foreground">Selecionado: {desktopBanner}</p> : null}
          </div>
          <div>
            <Label htmlFor="banner-mobile">Banner mobile</Label>
            <Input id="banner-mobile" type="file" accept="image/*" onChange={(e) => setMobileBanner(e.target.files?.[0]?.name ?? "")} />
            {mobileBanner ? <p className="mt-1 text-xs text-muted-foreground">Selecionado: {mobileBanner}</p> : null}
          </div>
        </div>
        <Button
          className="mt-3"
          variant="outline"
          onClick={() => toast.success("Banners atualizados (simulado).")}
        >
          Salvar banners
        </Button>
      </PanelCard>
    </AdminLayout>
  );
}
