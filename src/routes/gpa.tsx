import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { ArrowRight, FileDown, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { calculateGPA, gradePointForMarks, letterGrade } from "@/lib/gpa";
import { downloadGpaPdf } from "@/lib/pdf";
import { getDepartmentLabel } from "@/data/subjects";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { saveGpaRecord, listMyRecords } from "@/lib/records.functions";

export const Route = createFileRoute("/gpa")({
  head: () => ({
    meta: [
      { title: "GPA Calculator — UOS Grades" },
      {
        name: "description",
        content:
          "Enter your marks and instantly get your semester GPA using the University of Swabi grading formula.",
      },
    ],
  }),
  component: GpaPage,
});

interface Row {
  id: string;
  subjectName: string;
  creditHours: number;
  marks: string;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyRow = (): Row => ({ id: uid(), subjectName: "", creditHours: 3, marks: "" });

function GpaPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const saveFn = useServerFn(saveGpaRecord);
  const listFn = useServerFn(listMyRecords);

  const { data: history } = useQuery({
    queryKey: ["my-records"],
    queryFn: () => listFn(),
    enabled: !!user,
    staleTime: 10_000,
  });

  const [department, setDepartment] = useState<string>("");
  const [semester, setSemester] = useState<number>(1);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("uos:gpa:setup");
    if (!raw) return;
    try {
      const s = JSON.parse(raw) as {
        department: string;
        semester: number;
        subjects: { name: string; creditHours: number }[];
      };
      setDepartment(s.department);
      setSemester(s.semester);
      setRows(s.subjects.map((x) => ({ id: uid(), subjectName: x.name, creditHours: x.creditHours, marks: "" })));
      sessionStorage.removeItem("uos:gpa:setup");
    } catch {
      /* ignore */
    }
  }, []);

  const parsedRows = rows.map((r) => ({
    ...r,
    marksNum: r.marks === "" ? NaN : Number(r.marks),
  }));
  const allFilled = parsedRows.every(
    (r) => r.subjectName.trim() && r.creditHours > 0 && Number.isFinite(r.marksNum) && r.marksNum >= 0 && r.marksNum <= 100,
  );

  const summary = useMemo(() => {
    if (!allFilled) return null;
    return calculateGPA(
      parsedRows.map((r) => ({
        subjectName: r.subjectName.trim(),
        creditHours: r.creditHours,
        marks: r.marksNum,
      })),
    );
  }, [allFilled, parsedRows]);

  // Previous saved semesters (excluding current one being edited)
  const priorSemesters = useMemo(() => {
    const list = history?.gpa ?? [];
    return list.filter((r) => r.semester !== semester);
  }, [history, semester]);

  // Projected CGPA combining prior + current in-progress semester
  const projectedCgpa = useMemo(() => {
    if (!summary || priorSemesters.length === 0) return null;
    const priorCredits = priorSemesters.reduce((s, r) => s + r.total_credits, 0);
    const priorPoints = priorSemesters.reduce((s, r) => s + Number(r.total_grade_points), 0);
    const totalCredits = priorCredits + summary.totalCredits;
    const totalPoints = priorPoints + summary.totalGradePoints;
    if (totalCredits === 0) return null;
    return {
      cgpa: totalPoints / totalCredits,
      totalCredits,
      totalPoints,
      semesterCount: priorSemesters.length + 1,
    };
  }, [summary, priorSemesters]);

  function updateRow(id: string, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function removeRow(id: string) {
    setRows((rs) => (rs.length > 1 ? rs.filter((r) => r.id !== id) : rs));
  }
  function addRow() {
    setRows((rs) => [...rs, emptyRow()]);
  }
  function resetAll() {
    setRows((rs) => rs.map((r) => ({ ...r, marks: "" })));
  }

  async function saveToHistory() {
    if (!summary) return;
    if (!user) {
      toast.error("Sign in to save your calculation");
      navigate({ to: "/auth" });
      return;
    }
    setSaving(true);
    try {
      await saveFn({
        data: {
          department: department || "unspecified",
          semester,
          gpa: summary.gpa,
          total_credits: summary.totalCredits,
          total_grade_points: summary.totalGradePoints,
          subjects: summary.results,
        },
      });
      toast.success(`Semester ${semester} saved — view your CGPA`);
      navigate({ to: "/cgpa" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function studentName() {
    if (!user) return null;
    const md = user.user_metadata as { first_name?: string; last_name?: string };
    const name = [md?.first_name, md?.last_name].filter(Boolean).join(" ").trim();
    if (name) return name;
    const { data } = await supabase.from("profiles").select("first_name,last_name").eq("id", user.id).maybeSingle();
    if (data) return [data.first_name, data.last_name].filter(Boolean).join(" ").trim() || null;
    return null;
  }

  async function downloadPdf() {
    if (!summary) return;
    const name = await studentName();
    downloadGpaPdf({
      studentName: name,
      department: department || "unspecified",
      semester,
      gpa: summary.gpa,
      totalCredits: summary.totalCredits,
      totalGradePoints: summary.totalGradePoints,
      results: summary.results,
    });
  }

  function continueToCgpa() {
    if (!summary) return;
    sessionStorage.setItem(
      "uos:cgpa:prefill",
      JSON.stringify({ semester, gpa: summary.gpa, creditHours: summary.totalCredits }),
    );
    navigate({ to: "/cgpa" });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-grow px-4 pt-24 pb-10 md:pb-14">
        <header className="mb-8">
          <p className="text-sm font-medium text-primary">
            {department ? getDepartmentLabel(department) : "Semester GPA"} · Semester {semester}
          </p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight md:text-5xl">
            GPA Calculator
          </h1>
          <p className="mt-2 text-muted-foreground">
            Enter marks out of 100 for each subject. Grade points follow the UOS formula.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Rows */}
          <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                Semester
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={semester}
                  onChange={(e) => setSemester(Number(e.target.value) || 1)}
                  className="ml-2 w-16 rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
              </label>
              <button
                onClick={addRow}
                className="ml-auto inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <Plus className="h-3.5 w-3.5" /> Add subject
              </button>
              <button
                onClick={resetAll}
                className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                <RotateCcw className="h-3.5 w-3.5" /> Clear marks
              </button>
            </div>

            <div className="space-y-2">
              {rows.map((r, idx) => {
                const marksNum = r.marks === "" ? NaN : Number(r.marks);
                const gp = Number.isFinite(marksNum) ? gradePointForMarks(marksNum) : null;
                return (
                  <div
                    key={r.id}
                    className="grid gap-2 rounded-lg border border-border bg-background p-3 sm:grid-cols-[1fr_84px_84px_84px_auto]"
                  >
                    <input
                      value={r.subjectName}
                      onChange={(e) => updateRow(r.id, { subjectName: e.target.value })}
                      placeholder={`Subject ${idx + 1}`}
                      className="rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                    <input
                      type="number"
                      min={0}
                      max={12}
                      value={r.creditHours}
                      onChange={(e) => updateRow(r.id, { creditHours: Number(e.target.value) || 0 })}
                      className="rounded-md border border-input bg-background px-3 py-2 text-center text-sm"
                      aria-label="Credit hours"
                    />
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={r.marks}
                      placeholder="Marks"
                      onChange={(e) => updateRow(r.id, { marks: e.target.value })}
                      className="rounded-md border border-input bg-background px-3 py-2 text-center text-sm"
                    />
                    <div className="flex items-center justify-center rounded-md bg-muted px-2 py-2 text-sm font-semibold">
                      {gp === null ? (
                        <span className="text-muted-foreground">–</span>
                      ) : (
                        <span className={gp === 0 ? "text-destructive" : "text-primary"}>
                          {gp.toFixed(2)}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => removeRow(r.id)}
                      disabled={rows.length === 1}
                      className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive disabled:opacity-30"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Grade points: below 50 = 0.00 · 50–89 = 2.00 + (marks − 50) × 0.05 · 90+ = 4.00.
            </p>
          </div>

          {/* Result panel */}
          <aside className="h-fit rounded-2xl border border-border bg-scholarly p-6 text-primary-foreground shadow-scholarly">
            <div className={projectedCgpa ? "grid grid-cols-2 gap-4" : ""}>
              <div>
                <p className="text-xs font-medium uppercase tracking-wider opacity-80">Semester GPA</p>
                <p className="mt-2 font-serif text-5xl font-semibold">
                  {summary ? summary.gpa.toFixed(2) : "—"}
                </p>
                <p className="text-xs opacity-80">
                  {summary ? letterGrade(summary.gpa) : "Fill every row"}
                </p>
              </div>
              {projectedCgpa ? (
                <div className="border-l border-white/15 pl-4">
                  <p className="text-xs font-medium uppercase tracking-wider opacity-80">Projected CGPA</p>
                  <p className="mt-2 font-serif text-5xl font-semibold">
                    {projectedCgpa.cgpa.toFixed(2)}
                  </p>
                  <p className="text-xs opacity-80">
                    {projectedCgpa.semesterCount} sems · {projectedCgpa.totalCredits} cr
                  </p>
                </div>
              ) : null}
            </div>
            {!projectedCgpa && summary ? (
              <p className="mt-2 text-sm opacity-80">
                {`${letterGrade(summary.gpa)} grade · ${summary.totalCredits} credits`}
              </p>
            ) : null}
            {projectedCgpa ? (
              <p className="mt-3 text-xs opacity-75">
                CGPA updates live as you enter marks. For a downloadable transcript, save this semester and open the{" "}
                <Link to="/cgpa" className="underline">CGPA page</Link>.
              </p>
            ) : null}
            <div className="mt-6 space-y-2 border-t border-white/15 pt-5 text-sm">
              <div className="flex justify-between">
                <span className="opacity-80">Total credits</span>
                <span className="font-medium">{summary?.totalCredits ?? "–"}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Grade points</span>
                <span className="font-medium">{summary?.totalGradePoints.toFixed(2) ?? "–"}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-80">Subjects</span>
                <span className="font-medium">{summary?.results.length ?? rows.length}</span>
              </div>
            </div>
            <div className="mt-6 space-y-2">
              <button
                onClick={downloadPdf}
                disabled={!summary}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent-grad px-4 py-2.5 text-sm font-semibold text-accent-foreground shadow-card transition disabled:opacity-40"
              >
                <FileDown className="h-4 w-4" /> Download PDF
              </button>
              <button
                onClick={saveToHistory}
                disabled={!summary || saving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-white/10 disabled:opacity-40"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving..." : user ? "Save to history" : "Sign in to save"}
              </button>
              <button
                onClick={continueToCgpa}
                disabled={!summary}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-white/10 disabled:opacity-40"
              >
                Continue to CGPA <ArrowRight className="h-4 w-4" />
              </button>
              {!user ? (
                <p className="pt-3 text-center text-xs opacity-80">
                  <Link to="/auth" className="underline">
                    Sign in
                  </Link>{" "}
                  to keep a running academic history.
                </p>
              ) : null}
            </div>
          </aside>
        </div>

        {summary ? (
          <section className="mt-10 rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-serif text-2xl font-semibold">Subject breakdown</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Subject</th>
                    <th className="pb-2 font-medium">Credits</th>
                    <th className="pb-2 font-medium">Marks</th>
                    <th className="pb-2 font-medium">Grade Point</th>
                    <th className="pb-2 text-right font-medium">GP × Credits</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.results.map((r) => (
                    <tr key={r.subjectName} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 font-medium">{r.subjectName}</td>
                      <td className="py-2.5">{r.creditHours}</td>
                      <td className="py-2.5">{r.marks}</td>
                      <td className={`py-2.5 font-semibold ${r.gradePoint === 0 ? "text-destructive" : "text-primary"}`}>
                        {r.gradePoint.toFixed(2)}
                      </td>
                      <td className="py-2.5 text-right">{r.gradePoints.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
      <SiteFooter />
    </div>
  );
}
