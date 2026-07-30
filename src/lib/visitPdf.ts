import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { Company } from "../types";
import { REPS } from "../data/config";

// A printable visit sheet: an empty checkbox per client (to tick off once
// visited) and a blank line beside it for the rep's own follow-up notes —
// meant to be printed or annotated on a tablet, not filled in on-screen.
export function generateVisitPdf(companies: Company[], repNames: string[], zone: string): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const dateLabel = new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(33, 31, 29);
  doc.text("Hoja de visitas", 40, 44);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(120, 113, 106);
  doc.text(`${zone} — ${repNames.join(", ")}`, 40, 62);
  doc.text(dateLabel, 40, 76);

  const rows = companies.map((c) => ["", c.name, c.city || "—", REPS[c.assignedRep]?.name ?? "", ""]);

  autoTable(doc, {
    startY: 92,
    head: [["Visitado", "Empresa", "Ciudad", "Comercial", "Comentario"]],
    body: rows,
    styles: { font: "helvetica", fontSize: 9, cellPadding: 6, valign: "middle", minCellHeight: 26 },
    headStyles: { fillColor: [168, 223, 207], textColor: [33, 31, 29], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 50, halign: "center" },
      1: { cellWidth: 140 },
      2: { cellWidth: 80 },
      3: { cellWidth: 70 },
      4: { cellWidth: "auto" },
    },
    didDrawCell: (data) => {
      if (data.section !== "body") return;
      const { cell, column } = data;
      if (column.index === 0) {
        const size = 12;
        const x = cell.x + cell.width / 2 - size / 2;
        const y = cell.y + cell.height / 2 - size / 2;
        doc.setDrawColor(120, 113, 106);
        doc.rect(x, y, size, size);
      }
      if (column.index === 4) {
        const lineY = cell.y + cell.height - 8;
        doc.setDrawColor(200, 195, 188);
        doc.line(cell.x + 4, lineY, cell.x + cell.width - 4, lineY);
      }
    },
  });

  const safeZone = zone.toLowerCase().replace(/\s+/g, "-");
  doc.save(`visitas-${safeZone}-${Date.now()}.pdf`);
}
