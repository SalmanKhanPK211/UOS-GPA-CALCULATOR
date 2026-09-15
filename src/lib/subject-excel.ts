export type ParsedSubject = { name: string; credit_hours: number; sort_order: number };

const HEADERS = ["Subject Name", "Credit Hours", "Sort Order"];

export async function downloadSubjectTemplate(departmentLabel: string) {
  const XLSX = await import("xlsx");
  const rows = [
    HEADERS,
    ["Applied Physics", 3, 1],
    ["Calculus I", 3, 2],
    ["Physics Lab", 1, 3],
  ];
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 40 }, { wch: 14 }, { wch: 12 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Subjects");
  const safe = departmentLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "department";
  XLSX.writeFile(wb, `subjects-template-${safe}.xlsx`);
}

export async function parseSubjectsFile(file: File): Promise<ParsedSubject[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error("The file has no sheets.");
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, { defval: "" });

  const out: ParsedSubject[] = [];
  raw.forEach((row, i) => {
    const get = (keys: string[]) => {
      for (const k of Object.keys(row)) {
        const norm = k.trim().toLowerCase();
        if (keys.includes(norm)) return row[k];
      }
      return undefined;
    };
    const name = String(get(["subject name", "subject", "name"]) ?? "").trim();
    if (!name) return;
    const credits = Number(get(["credit hours", "credits", "credit_hours", "credit"]) ?? 3);
    const order = Number(get(["sort order", "order", "sort_order"]) ?? i + 1);
    if (!Number.isFinite(credits) || credits < 1 || credits > 6)
      throw new Error(`Row ${i + 2}: credit hours must be a number between 1 and 6.`);
    out.push({
      name: name.slice(0, 160),
      credit_hours: Math.round(credits),
      sort_order: Number.isFinite(order) ? Math.max(0, Math.round(order)) : i + 1,
    });
  });

  if (out.length === 0) throw new Error("No subjects found. Use the provided template format.");
  return out;
}
