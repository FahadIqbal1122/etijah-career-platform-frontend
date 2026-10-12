// Builds the admin dashboard's Excel workbook. Pure formatting: callers hand over already-filtered rows.
// exceljs is loaded on demand so it never weighs on the admin page itself.

export type Cell = string | number | boolean | null | undefined
export type SheetSpec = {
  name: string            // <= 31 chars, no : \ / ? * [ ]
  headers: string[]
  rows: Cell[][]
  widths?: number[]       // optional per-column widths; otherwise sized from the content
  note?: string           // one line placed above the table (e.g. what was filtered out)
}
export type SummaryBlock = { title: string; rows: Cell[][]; headers?: string[] }

const HEADER_FILL = 'FF0B3C5D'
const BLOCK_FILL = 'FFE8F1F8'

function safeName(name: string, used: Set<string>) {
  let base = name.replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || 'Sheet'
  let n = base, i = 2
  while (used.has(n.toLowerCase())) n = `${base.slice(0, 28)} ${i++}`
  used.add(n.toLowerCase())
  return n
}

// Excel cells cap at 32,767 chars, and a leading = + - @ would be run as a formula when the file is opened.
function clean(v: Cell): string | number | boolean | null {
  if (v === null || v === undefined) return null
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v === 'boolean') return v
  let s = String(v)
  if (s.length > 32000) s = s.slice(0, 32000) + '…'
  if (/^[=+\-@]/.test(s)) s = `'${s}`
  return s
}

export async function buildWorkbook(title: string, summary: SummaryBlock[], sheets: SheetSpec[]): Promise<Blob> {
  const mod = await import('exceljs')
  // exceljs is CommonJS: depending on the bundler the constructors sit on `default` or on the module itself.
  const ExcelJS = ((mod as unknown as { default?: typeof mod }).default ?? mod) as typeof mod
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Etijahi Admin'
  wb.created = new Date()
  const used = new Set<string>()

  // ── Summary sheet: stacked blocks (filters, KPIs, breakdowns) ──
  const ws = wb.addWorksheet(safeName('Summary', used), { views: [{ showGridLines: false }] })
  ws.getColumn(1).width = 46
  for (let c = 2; c <= 6; c++) ws.getColumn(c).width = 22
  ws.addRow([title]).font = { bold: true, size: 16, color: { argb: HEADER_FILL } }
  ws.addRow([])
  for (const block of summary) {
    const t = ws.addRow([block.title])
    t.font = { bold: true, size: 12 }
    t.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: BLOCK_FILL } } })
    if (block.headers) {
      const h = ws.addRow(block.headers)
      h.font = { bold: true }
    }
    for (const r of block.rows) ws.addRow(r.map(clean))
    ws.addRow([])
  }

  // ── Data sheets ──
  for (const spec of sheets) {
    const sh = wb.addWorksheet(safeName(spec.name, used))
    let headerRow = 1
    if (spec.note) {
      sh.addRow([spec.note]).font = { italic: true, color: { argb: 'FF64748B' } }
      headerRow = 2
    }
    const h = sh.addRow(spec.headers)
    h.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    h.alignment = { vertical: 'middle', wrapText: true }
    h.eachCell(c => { c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } } })
    for (const r of spec.rows) sh.addRow(r.map(clean))
    sh.views = [{ state: 'frozen', ySplit: headerRow }]
    if (spec.rows.length > 0 && spec.headers.length > 0) {
      sh.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: headerRow, column: spec.headers.length } }
    }
    spec.headers.forEach((hd, i) => {
      if (spec.widths?.[i]) { sh.getColumn(i + 1).width = spec.widths[i]; return }
      let max = hd.length
      for (const r of spec.rows.slice(0, 300)) {
        const v = r[i]
        if (v !== null && v !== undefined) max = Math.max(max, String(v).length)
      }
      sh.getColumn(i + 1).width = Math.min(Math.max(10, max + 2), 60)
    })
  }

  const buf = await wb.xlsx.writeBuffer()
  return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
}

export function saveBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
