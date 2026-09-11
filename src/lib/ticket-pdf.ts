import type { DemoTicket } from "@/data/account";
import type { EventItem } from "@/data/events";

export async function downloadTicketPdf(ticket: DemoTicket, event: EventItem) {
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
  doc.text(event.name, margin, y, { maxWidth: width - margin * 2 });
  y += doc.getTextDimensions(event.name, { maxWidth: width - margin * 2 }).h + 4;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`${event.date} · ${event.time}`, margin, y);
  y += 6;
  doc.text(`${event.venue}, ${event.city}`, margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Titular", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`${ticket.holder} · ${ticket.holderDoc}`, margin, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.text("Ingresso", margin, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.text(`${ticket.type} · ${ticket.lot}`, margin, y);
  y += 6;
  doc.text(`Status: ${ticket.status}`, margin, y);
  y += 6;
  doc.text(`Código: ${ticket.code}`, margin, y);
  y += 12;

  const qrDataUrl = await QRCode.toDataURL(ticket.code, { width: 160, margin: 1, color: { dark: "#171717", light: "#ffffff" } });
  const qrSize = 50;
  const x = (width - qrSize) / 2;
  doc.addImage(qrDataUrl, "PNG", x, y, qrSize, qrSize);
  y += qrSize + 8;

  doc.setFontSize(9);
  doc.setTextColor(100, 100, 100);
  doc.setFont("helvetica", "italic");
  const footer = "Apresente este QR code na portaria. Em caso de meia-entrada, leve o documento comprovante.";
  doc.text(footer, margin, y, { maxWidth: width - margin * 2 });

  doc.save(`ingresso-${ticket.code}.pdf`);
}
