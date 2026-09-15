import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { FileDown, Save, Loader2, ArrowLeft } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { calculateCGPA, letterGrade } from "@/lib/gpa";
import { downloadCgpaPdf } from "@/lib/pdf";
import { useAuth } from "@/hooks/use-auth";
import { listMyRecords, saveCgpaRecord } from "@/lib/records.functions";

export const Route = createFileRoute("/cgpa")({
  head: () => ({
    meta: [
      { title: "CGPA Calculator — UOS Grades" },
      {
        name: "description",
        content:
          "Your saved semester GPAs are combined automatically into your cumulative CGPA.",
      },
    ],
  }),
  component: CgpaPage,
});

function CgpaPage() {
  const { user, loading, displayName } = useAuth();
  const listFn = useServerFn(listMyRecords);
  const saveFn = useServerFn(saveCgpaRecord);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-records"],
    queryFn: () => listFn(),
    enabled: !!user,
    staleTime: 10_000,
  });

  const saved = useMemo(
    () => (data?.gpa ?? []).slice().sort((a, b) => a.semester - b.semester),
    [data],
  );

  const summary = useMemo(() => {
    if (saved.length === 0) return null;
    return calculateCGPA(
      saved.map((r) => ({
        semester: r.semester,
        gpa: Number(r.gpa),
        creditHours: r.total_credits,
        gradePoints: Number(r.total_grade_points),
      })),
    );
  }, [saved]);

  const semesterDetails = useMemo(() => {
    return saved.map((r) => ({
      semester: r.semester,
      gpa: Number(r.gpa),
      creditHours: r.total_credits,
      gradePoints: Number(r.total_grade_points),
      subjects: Array.isArray(r.subjects)
        ? (r.subjects as unknown as {
            subjectName: string;
            creditHours: number;
            marks: number;
            gradePoint: number;
            gradePoints: number;
          }[])
        : [],
    }));
  }, [saved]);

  const saveCgpa = useMutation({
    mutationFn: () => {
      if (!summary) throw new Error("Nothing to save");
      return saveFn({
        data: {
          cgpa: summary.cgpa,
          total_credits: summary.totalCredits,
          total_grade_points: summary.totalGradePoints,
          semesters: summary.rows,
        },
      });
    },
    onSuccess: () => {
      toast.success("CGPA snapshot saved");
      qc.invalidateQueries({ queryKey: ["my-records"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Save failed"),
  });

  function downloadPdf() {
    if (!summary) return;
    downloadCgpaPdf({
      studentName: displayName,
      department: data?.profile?.department ?? null,
      cgpa: summary.cgpa,
      totalCredits: summary.totalCredits,
      totalGradePoints: summary.totalGradePoints,
      semesters: semesterDetails,
    });
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-5xl flex-grow px-4 pt-24 pb-10 md:pb-14">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600">Cumulative GPA</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight md:text-5xl text-gray-800">
            Your CGPA
          </h1>
          <p className="mt-2 text-muted-foreground">
            Automatically combines every semester you've saved to your profile.
          </p>
        </header>

        {loading || isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : !user ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <p className="text-gray-600 mb-4">Sign in to view your saved CGPA.</p>
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              Sign in
            </Link>
          </div>
        ) : saved.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-card">
            <p className="text-gray-600 mb-4">
              No saved semesters yet. Calculate a semester GPA and save it to build your CGPA.
            </p>
            <Link to="/" className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700">
              <ArrowLeft className="h-4 w-4" /> Start a semester
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <div className="rounded-2xl border border-border bg-card p-4 shadow-card md:p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-4">Saved semesters</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-2 font-medium">Semester</th>
                      <th className="pb-2 font-medium">GPA</th>
                      <th className="pb-2 font-medium">Credits</th>
                      <th className="pb-2 text-right font-medium">Grade Points</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary?.rows.map((r) => (
                      <tr key={r.semester} className="border-b border-border/60 last:border-0">
                        <td className="py-2.5 font-medium">Semester {r.semester}</td>
                        <td className="py-2.5">{r.gpa.toFixed(2)}</td>
                        <td className="py-2.5">{r.creditHours}</td>
                        <td className="py-2.5 text-right">{r.gradePoints.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-4 text-xs text-muted-foreground">
                Want to add another semester?{" "}
                <Link to="/" className="text-blue-600 hover:underline">Head back home</Link> and calculate it — it'll auto-append here.
              </p>
            </div>

            <aside className="h-fit rounded-2xl border border-border bg-scholarly p-6 text-primary-foreground shadow-scholarly">
              <p className="text-xs font-medium uppercase tracking-wider opacity-80">Your CGPA</p>
              <p className="mt-2 font-serif text-6xl font-semibold">
                {summary ? summary.cgpa.toFixed(2) : "—"}
              </p>
              <p className="text-sm opacity-80">
                {summary
                  ? `${letterGrade(summary.cgpa)} · ${summary.rows.length} semesters · ${summary.totalCredits} credits`
                  : "—"}
              </p>
              <div className="mt-6 space-y-2 border-t border-white/15 pt-5 text-sm">
                <div className="flex justify-between">
                  <span className="opacity-80">Total credits</span>
                  <span className="font-medium">{summary?.totalCredits ?? "–"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-80">Grade points</span>
                  <span className="font-medium">{summary?.totalGradePoints.toFixed(2) ?? "–"}</span>
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
                  onClick={() => saveCgpa.mutate()}
                  disabled={!summary || saveCgpa.isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-white/10 disabled:opacity-40"
                >
                  <Save className="h-4 w-4" />
                  {saveCgpa.isPending ? "Saving..." : "Save CGPA snapshot"}
                </button>
              </div>
            </aside>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
