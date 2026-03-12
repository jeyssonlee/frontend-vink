// ─── Excel Export ─────────────────────────────────────────────────────────────
export async function exportToExcel(
    rows: Record<string, unknown>[],
    filename: string
  ) {
    const XLSX = await import("xlsx")
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Reporte")
    XLSX.writeFile(wb, `${filename}.xlsx`)
  }
  
  // ─── PDF Export ───────────────────────────────────────────────────────────────
  export async function exportToPDF(
    title: string,
    columns: string[],
    rows: (string | number)[][],
    filename: string
  ) {
    const { default: jsPDF } = await import("jspdf")
    const { default: autoTable } = await import("jspdf-autotable")
  
    const doc = new jsPDF({ orientation: "landscape" })
  
    doc.setFontSize(14)
    doc.setTextColor(30, 30, 30)
    doc.text(title, 14, 16)
  
    doc.setFontSize(9)
    doc.setTextColor(120, 120, 120)
    doc.text(`Generado: ${new Date().toLocaleString("es-VE")}`, 14, 22)
  
    autoTable(doc, {
      head: [columns],
      body: rows,
      startY: 28,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [20, 184, 166], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    })
  
    doc.save(`${filename}.pdf`)
  }