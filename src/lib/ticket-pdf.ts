import type { Tables } from "@/integrations/meu-supabase/types";

const statusLabel: Record<string, string> = {
  valid: "Válido",
  used: "Utilizado",
  transferred: "Transferido",
  refunded: "Reembolsado",
  canceled: "Cancelado",
};

export async function downloadTicketPdf(ticket: Tables<"tickets">, event: Tables<"events">) {
  const [{ jsPDF }, QRCode] = await Promise.all([import("jspdf"), import("qrcode")]);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "A5" });
  const width = doc.internal.pageSize.getWidth();
  const margin = 12;
  let y = margin;

  doc.setFillColor(126, 34, 206);
  doc.rect(0, 0, width, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.text("Entrô", margin, y + 9);
  doc.setFontSize(10);
  doc.text("Ingresso digital", width - margin, y + 9, { align: "right" });

  y += 34;
  doc.setTextColor(23, 23, 23);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(event.title, margin, y, { maxWidth: width - margin * 2 });
  y += doc.getTextDimensions(event.title, { maxWidth: width - margin * 2 }).h + 4;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  const startsAt = event.starts_at ? new Date(event.starts_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "Data a confirmar";
  doc.text(startsAt, margin, y);
  y += 6;
  doc.text(`${event.venue_name ?? ""}${event.city ? `, ${event.city}` : ""}`, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Titular", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`${ticket.holder_name}${ticket.holder_cpf ? ` · ${ticket.holder_cpf}` : ""}`, margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Ingresso", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(ticket.is_half_price ? "Meia-entrada" : "Inteira", margin, y);
  y += 6;
  doc.text(`Status: ${statusLabel[ticket.status] ?? ticket.status}`, margin, y);
  y += 6;
  doc.text(`Código: ${ticket.qr_token}`, margin, y);
  y += 12;

  const qrDataUrl = await QRCode.toDataURL(ticket.qr_token, { width: 160, margin: 1, color: { dark: "#171717", light: "#ffffff" } });
  const qrSize = 50;
  const x = (width - qrSize) / 2;
  doc.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);
  y += qrSize + 8;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "italic");
  const footer = "Apresente este QR code na portaria. Em caso de meia-entrada, leve o documento comprovante.";
  doc.text(footer, margin, y, { maxWidth: width - margin * 2 });

  doc.save(`ingresso-${ticket.qr_token}.pdf`);
}
