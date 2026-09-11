// Builds real, properly-organized .xlsx workbooks (via SheetJS) for the
// "Export to Excel" buttons on Invoices and Reports. Dynamically imported so
// the library never loads into the main bundle for users who don't export —
// same pattern as the jsPDF-based invoice/tenant PDF exports.
//
// Note: SheetJS's free/community edition (what's installed here) does NOT
// support cell colors or bold fonts on write — that's a Pro-only feature.
// So "organized" here means what's actually achievable for free: sized
// columns, thousands-separated numbers, and a merged title row per sheet —
// not colored/bold headers.

export async function exportToExcel(sheets, filename) {
  const XLSX = await import("xlsx")
  const wb = XLSX.utils.book_new()

  sheets.forEach(({ name, rows, title }) => {
    const dataRows = rows && rows.length ? rows : [{}]
    const headers = Object.keys(dataRows[0])
    // Row (0-indexed) the column headers land on — pushed down two rows to
    // leave room for the merged title + a blank spacer row, when there is one.
    const headerRowIndex = title ? 2 : 0

    let ws
    if (title) {
      ws = XLSX.utils.aoa_to_sheet([[title]])
      XLSX.utils.sheet_add_json(ws, dataRows, { origin: { r: headerRowIndex, c: 0 } })
      ws["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(headers.length - 1, 0) } }]
    } else {
      ws = XLSX.utils.json_to_sheet(dataRows)
    }

    // Column widths sized to the longest value (or header) in each column,
    // instead of Excel's cramped default — the single biggest thing that
    // makes an unformatted export look "rough".
    ws["!cols"] = headers.map(h => {
      const maxLen = Math.max(h.length, ...dataRows.map(r => String(r[h] ?? "").length))
      return { wch: Math.min(Math.max(maxLen + 2, 10), 42) }
    })

    // Thousands-separated number format for any column that's entirely
    // numeric (amounts, counts, percentages) — turns "1500000" into
    // "1,500,000" without needing to pre-format values as strings.
    headers.forEach((h, colIdx) => {
      const isNumericColumn = dataRows.every(r => typeof r[h] === "number")
      if (!isNumericColumn) return
      dataRows.forEach((_, i) => {
        const ref = XLSX.utils.encode_cell({ r: headerRowIndex + 1 + i, c: colIdx })
        if (ws[ref]) ws[ref].z = "#,##0"
      })
    })

    // Excel sheet names are capped at 31 characters and can't repeat.
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31))
  })

  XLSX.writeFile(wb, filename)
}
