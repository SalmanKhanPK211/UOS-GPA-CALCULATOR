import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import {
  Trash2,
  GraduationCap,
  ClipboardList,
  Sparkles,
  TrendingUp,
  Loader2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Target,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Skeleton } from "@/components/ui/skeleton";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import {
  analyzePerformance,
  deleteRecord,
  listMyRecords,
} from "@/lib/records.functions";
import { getDepartmentLabel } from "@/data/subjects";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — UOS Grades" },
      {
        name: "description",
        content:
          "Track your semester GPAs, CGPA trend and get AI-powered study suggestions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type SubjectRow = {
  subjectName: string;
  creditHours: number;
  marks: number;
  gradePoint: number;
  gradePoints: number;
};

function DashboardPage() {
  const listFn = useServerFn(listMyRecords);
  const delFn = useServerFn(deleteRecord);
  const aiFn = useServerFn(analyzePerformance);
  const qc = useQueryClient();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["my-records"],
    queryFn: () => listFn(),
    retry: 1,
  });

  const del = useMutation({
    mutationFn: (v: { kind: "gpa" | "cgpa"; id: string }) => delFn({ data: v }),
    onSuccess: () => {
      toast.success("Deleted");
      qc.invalidateQueries({ queryKey: ["my-records"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const [analysis, setAnalysis] = useState<string>("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string>("");

  async function runAi() {
    setAiBusy(true);
    setAiError("");
    try {
      const res = await aiFn();
      setAnalysis(res.analysis);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Analysis failed";
      setAiError(
        /429|rate/i.test(msg)
          ? "The AI coach is busy right now (rate limit). Please try again in a minute."
          : /402|credit/i.test(msg)
            ? "AI credits are exhausted for this workspace. Add credits to continue."
            : msg,
      );
    } finally {
      setAiBusy(false);
    }
  }

  const name =
    [data?.profile?.first_name, data?.profile?.last_name].filter(Boolean).join(" ") ||
    "Student";

  const gpaList = (data?.gpa ?? []).slice().sort((a, b) => a.semester - b.semester);

  const chartData = useMemo(() => {
    let cumCr = 0;
    let cumGp = 0;
    return gpaList.map((r) => {
      cumCr += Number(r.total_credits);
      cumGp += Number(r.total_grade_points);
      const cgpa = cumCr > 0 ? cumGp / cumCr : 0;
      return {
        semester: `Sem ${r.semester}`,
        semesterNumber: r.semester,
        GPA: Number(Number(r.gpa).toFixed(2)),
        CGPA: Number(cgpa.toFixed(2)),
      };
    });
  }, [gpaList]);

  const currentCgpa = chartData.length ? chartData[chartData.length - 1].CGPA : 0;

  // Interactive series toggles
  const [showGpa, setShowGpa] = useState(true);
  const [showCgpa, setShowCgpa] = useState(true);

  // Interactive subject breakdown
  const [selectedSemester, setSelectedSemester] = useState<number | null>(null);
  useEffect(() => {
    if (gpaList.length && selectedSemester === null) {
      setSelectedSemester(gpaList[gpaList.length - 1].semester);
    }
  }, [gpaList, selectedSemester]);

  const selectedRecord = gpaList.find((r) => r.semester === selectedSemester);
  const subjectData = useMemo(() => {
    const subs = Array.isArray(selectedRecord?.subjects)
      ? (selectedRecord!.subjects as unknown as SubjectRow[])
      : [];
    return subs.map((s) => ({
      name: s.subjectName,
      short:
        s.subjectName.length > 16 ? `${s.subjectName.slice(0, 15)}…` : s.subjectName,
      Marks: Number(s.marks),
      "Grade point": Number(Number(s.gradePoint).toFixed(2)),
      credits: s.creditHours,
    }));
  }, [selectedRecord]);

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-6xl flex-grow px-4 pt-24 pb-10 md:pb-14">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">Welcome back, {name}</p>
            <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-gray-800 md:text-5xl">
              Dashboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              Your semester performance, CGPA trend and AI-powered insights.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-white px-5 py-3 text-right shadow-card">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Current CGPA</p>
            {isLoading ? (
              <Skeleton className="mt-1 h-9 w-20" />
            ) : (
              <p className="font-serif text-3xl font-bold text-blue-700">
                {currentCgpa.toFixed(2)}
              </p>
            )}
          </div>
        </header>

        {isLoading ? (
          <DashboardSkeleton />
        ) : isError ? (
          <ErrorState
            title="We couldn't load your records"
            message={
              error instanceof Error
                ? error.message
                : "Something went wrong while fetching your saved GPA data."
            }
            onRetry={() => refetch()}
            busy={isFetching}
          />
        ) : (
          <>
            {/* Trend chart */}
            <section className="mb-10 rounded-2xl border border-border bg-white p-5 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <TrendingUp className="h-4 w-4" /> Performance trend
                </div>
                <div className="flex gap-2">
                  <SeriesToggle
                    label="GPA"
                    color="#2563eb"
                    active={showGpa}
                    onClick={() => setShowGpa((v) => !v)}
                  />
                  <SeriesToggle
                    label="CGPA"
                    color="#f59e0b"
                    active={showCgpa}
                    onClick={() => setShowCgpa((v) => !v)}
                  />
                </div>
              </div>
              {chartData.length === 0 ? (
                <EmptyState message="Save a semester GPA to see your performance chart." />
              ) : (
                <>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={chartData}
                        margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                        onClick={(state: { activeLabel?: string }) => {
                          const point = chartData.find(
                            (d) => d.semester === state?.activeLabel,
                          );
                          if (point) setSelectedSemester(point.semesterNumber);
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="semester" stroke="#6b7280" fontSize={12} />
                        <YAxis domain={[0, 4]} stroke="#6b7280" fontSize={12} />
                        <Tooltip
                          contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
                          formatter={(v: number) => v.toFixed(2)}
                        />
                        <Legend />
                        {showGpa && (
                          <Line
                            type="monotone"
                            dataKey="GPA"
                            stroke="#2563eb"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                        {showCgpa && (
                          <Line
                            type="monotone"
                            dataKey="CGPA"
                            stroke="#f59e0b"
                            strokeWidth={2.5}
                            dot={{ r: 4 }}
                            activeDot={{ r: 6 }}
                          />
                        )}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Tip: click a point on the chart to inspect that semester's subjects below.
                  </p>
                </>
              )}
            </section>

            {/* Target CGPA planner */}
            <TargetPlanner
              earnedCredits={
                gpaList.reduce((a, r) => a + Number(r.total_credits), 0)
              }
              earnedGradePoints={
                gpaList.reduce((a, r) => a + Number(r.total_grade_points), 0)
              }
              completedSemesters={gpaList.length}
              totalSemesters={data?.totalSemesters ?? null}
            />

            {/* Subject breakdown */}
            <section className="mb-10 rounded-2xl border border-border bg-white p-5 shadow-card">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  <BarChart3 className="h-4 w-4" /> Subject breakdown
                </div>
                <div className="flex flex-wrap gap-2">
                  {gpaList.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => setSelectedSemester(r.semester)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                        selectedSemester === r.semester
                          ? "border-blue-600 bg-blue-600 text-white"
                          : "border-border bg-white text-gray-600 hover:border-blue-300 hover:text-blue-700"
                      }`}
                    >
                      Sem {r.semester}
                    </button>
                  ))}
                </div>
              </div>
              {subjectData.length === 0 ? (
                <EmptyState message="Save a semester GPA to explore its subject-by-subject breakdown." />
              ) : (
                <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={subjectData}
                      margin={{ top: 10, right: 20, left: -10, bottom: 40 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis
                        dataKey="short"
                        stroke="#6b7280"
                        fontSize={11}
                        interval={0}
                        angle={-25}
                        textAnchor="end"
                      />
                      <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} />
                      <Tooltip
                        cursor={{ fill: "rgba(37,99,235,0.06)" }}
                        contentStyle={{ borderRadius: 8, borderColor: "#e5e7eb" }}
                        content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload as (typeof subjectData)[number];
                          return (
                            <div className="rounded-lg border border-border bg-white px-3 py-2 text-xs shadow-md">
                              <p className="font-semibold text-gray-800">{d.name}</p>
                              <p className="text-muted-foreground">Marks: {d.Marks}</p>
                              <p className="text-muted-foreground">
                                Grade point: {d["Grade point"].toFixed(2)}
                              </p>
                              <p className="text-muted-foreground">
                                Credit hours: {d.credits}
                              </p>
                            </div>
                          );
                        }}
                      />
                      <Bar dataKey="Marks" radius={[6, 6, 0, 0]}>
                        {subjectData.map((d, i) => (
                          <Cell
                            key={i}
                            fill={
                              d.Marks >= 80
                                ? "#2563eb"
                                : d.Marks >= 65
                                  ? "#60a5fa"
                                  : d.Marks >= 50
                                    ? "#f59e0b"
                                    : "#ef4444"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </section>

            {/* AI panel */}
            <section className="mb-10 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 p-6 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-blue-800">
                  <Sparkles className="h-5 w-5" />
                  <h2 className="font-serif text-xl font-semibold">AI performance coach</h2>
                </div>
                <button
                  onClick={runAi}
                  disabled={aiBusy || chartData.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {aiBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {analysis ? "Refresh insights" : "Analyze my performance"}
                </button>
              </div>

              {aiBusy ? (
                <div className="mt-4 space-y-3 rounded-xl border border-blue-100 bg-white/80 p-5">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-11/12" />
                  <Skeleton className="h-4 w-9/12" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-10/12" />
                  <p className="pt-1 text-xs text-blue-700">
                    Analyzing your semester trend…
                  </p>
                </div>
              ) : aiError ? (
                <div className="mt-4">
                  <ErrorState
                    title="Analysis unavailable"
                    message={aiError}
                    onRetry={runAi}
                    busy={false}
                  />
                </div>
              ) : analysis ? (
                <article className="mt-4 w-full min-w-0 overflow-x-hidden break-words rounded-xl border border-blue-100 bg-white/80 p-3 text-[14px] leading-relaxed text-gray-700 sm:p-5 sm:text-[15px] [&_h2]:mt-5 [&_h2]:mb-2 [&_h2]:font-serif [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-blue-800 sm:[&_h2]:text-lg [&_h2:first-child]:mt-0 [&_p]:mb-3 [&_strong]:font-semibold [&_strong]:text-gray-900 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_table]:mb-0 [&_table]:w-full [&_table]:min-w-[420px] [&_table]:border-collapse [&_table]:text-[13px] sm:[&_table]:text-sm [&_th]:border [&_th]:border-blue-100 [&_th]:bg-blue-50 [&_th]:px-2 [&_th]:py-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-blue-800 sm:[&_th]:px-3 sm:[&_th]:py-2 [&_td]:border [&_td]:border-blue-100 [&_td]:px-2 [&_td]:py-1.5 sm:[&_td]:px-3 sm:[&_td]:py-2">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node: _node, ...props }) => (
                        <div className="mb-4 -mx-1 overflow-x-auto px-1">
                          <table {...props} />
                        </div>
                      ),
                    }}
                  >
                    {analysis}
                  </ReactMarkdown>
                </article>

              ) : (
                <p className="mt-3 text-sm text-gray-600">
                  {chartData.length === 0
                    ? "Save at least one semester GPA to unlock AI insights."
                    : "Get personalized feedback on your trend and suggestions to improve next semester."}
                </p>
              )}
            </section>

            {/* GPA history */}
            <section className="mb-10">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <GraduationCap className="h-4 w-4" /> Semester GPAs · {gpaList.length}
              </div>
              {gpaList.length === 0 ? (
                <EmptyState message="No saved GPA calculations yet. Save one from the GPA calculator." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {gpaList.map((r) => (
                    <article
                      key={r.id}
                      className="rounded-2xl border border-border bg-white p-5 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()} ·{" "}
                            {getDepartmentLabel(r.department)}
                          </p>
                          <h3 className="mt-1 font-serif text-xl font-semibold text-gray-800">
                            Semester {r.semester}
                          </h3>
                        </div>
                        <button
                          onClick={() => del.mutate({ kind: "gpa", id: r.id })}
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-4 flex items-baseline gap-4">
                        <p className="font-serif text-4xl font-semibold text-blue-700">
                          {Number(r.gpa).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {r.total_credits} credits ·{" "}
                          {Number(r.total_grade_points).toFixed(2)} GP
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {/* CGPA history */}
            <section>
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                <ClipboardList className="h-4 w-4" /> Saved CGPA reports · {(data?.cgpa ?? []).length}
              </div>
              {(data?.cgpa ?? []).length === 0 ? (
                <EmptyState message="Save a CGPA report from the CGPA page to keep a snapshot here." />
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                  {(data?.cgpa ?? []).map((r) => (
                    <article
                      key={r.id}
                      className="rounded-2xl border border-border bg-white p-5 shadow-card"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.created_at).toLocaleDateString()}
                          </p>
                          <h3 className="mt-1 font-serif text-xl font-semibold text-gray-800">
                            Cumulative
                          </h3>
                        </div>
                        <button
                          onClick={() => del.mutate({ kind: "cgpa", id: r.id })}
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-4 flex items-baseline gap-4">
                        <p className="font-serif text-4xl font-semibold text-blue-700">
                          {Number(r.cgpa).toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {(r.semesters as unknown[]).length} semesters · {r.total_credits} credits
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <div className="mt-8 text-center text-sm text-muted-foreground">
              Ready for another semester?{" "}
              <Link to="/" className="font-medium text-blue-600 hover:underline">
                Go to home
              </Link>
            </div>
          </>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function SeriesToggle({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-border bg-white text-gray-700"
          : "border-dashed border-border bg-muted/40 text-muted-foreground"
      }`}
    >
      <span
        className="h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: active ? color : "transparent", border: `2px solid ${color}` }}
      />
      {label}
    </button>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-border bg-white p-5 shadow-card">
        <Skeleton className="mb-4 h-4 w-40" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </section>
      <section className="rounded-2xl border border-border bg-white p-5 shadow-card">
        <Skeleton className="mb-4 h-4 w-44" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </section>
      <section className="rounded-2xl border border-blue-100 bg-blue-50/60 p-6">
        <Skeleton className="mb-4 h-6 w-56" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="mt-2 h-4 w-10/12" />
      </section>
      <div className="grid gap-3 md:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl border border-border bg-white p-5 shadow-card">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-2 h-6 w-32" />
            <Skeleton className="mt-5 h-9 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorState({
  title,
  message,
  onRetry,
  busy,
}: {
  title: string;
  message: string;
  onRetry: () => void;
  busy: boolean;
}) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center"
    >
      <AlertTriangle className="mx-auto h-6 w-6 text-destructive" />
      <h3 className="mt-2 font-serif text-lg font-semibold text-gray-800">{title}</h3>
      <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">{message}</p>
      <button
        onClick={onRetry}
        disabled={busy}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm hover:bg-muted disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Try again
      </button>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function TargetPlanner({
  earnedCredits,
  earnedGradePoints,
  completedSemesters,
  totalSemesters,
}: {
  earnedCredits: number;
  earnedGradePoints: number;
  completedSemesters: number;
  totalSemesters: number | null;
}) {
  // sensible defaults derived from the student's data
  const defaultRemaining = Math.max(
    1,
    (totalSemesters ?? completedSemesters + 2) - completedSemesters,
  );
  const avgCreditsPerSem =
    completedSemesters > 0
      ? Math.round(earnedCredits / completedSemesters)
      : 16;

  const [target, setTarget] = useState(3.5);
  const [remainingSemesters, setRemainingSemesters] = useState(defaultRemaining);
  const [creditsPerSem, setCreditsPerSem] = useState(avgCreditsPerSem);

  const remainingCredits = remainingSemesters * creditsPerSem;
  const finalCredits = earnedCredits + remainingCredits;
  const neededGradePoints = target * finalCredits - earnedGradePoints;
  const requiredGpa = remainingCredits > 0 ? neededGradePoints / remainingCredits : 0;

  const achievable = requiredGpa <= 4;
  const alreadyThere = neededGradePoints <= 0;

  // progress of current CGPA toward target
  const currentCgpa = earnedCredits > 0 ? earnedGradePoints / earnedCredits : 0;
  const progress = Math.min(100, Math.max(0, (currentCgpa / target) * 100));

  if (completedSemesters === 0) {
    return (
      <section className="mb-10 rounded-2xl border border-border bg-white p-5 shadow-card">
        <div className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          <Target className="h-4 w-4" /> Target CGPA planner
        </div>
        <EmptyState message="Save at least one semester GPA to start planning toward a target CGPA." />
      </section>
    );
  }

  return (
    <section className="mb-10 rounded-2xl border border-border bg-white p-5 shadow-card">
      <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        <Target className="h-4 w-4" /> Target CGPA planner
      </div>

      <p className="mb-4 max-w-2xl text-sm text-muted-foreground">
        Set a graduation CGPA goal and the planner tells you the average GPA you
        must maintain in your remaining semesters to reach it.
      </p>

      <div className="grid gap-5 md:grid-cols-3">
        {/* inputs */}
        <div className="space-y-4">
          <Field label="Target CGPA">
            <input
              type="number"
              min={0}
              max={4}
              step={0.05}
              value={target}
              onChange={(e) => setTarget(Math.min(4, Math.max(0, Number(e.target.value))))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </Field>
          <Field label="Remaining semesters">
            <input
              type="number"
              min={1}
              max={12}
              step={1}
              value={remainingSemesters}
              onChange={(e) => setRemainingSemesters(Math.max(1, Math.min(12, Number(e.target.value))))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {totalSemesters && (
              <p className="mt-1 text-xs text-muted-foreground">
                Your program has {totalSemesters} semesters; you've done {completedSemesters}.
              </p>
            )}
          </Field>
          <Field label="Credits per remaining semester">
            <input
              type="number"
              min={1}
              max={30}
              step={1}
              value={creditsPerSem}
              onChange={(e) => setCreditsPerSem(Math.max(1, Math.min(30, Number(e.target.value))))}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm font-semibold text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            {completedSemesters > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Your average so far is {avgCreditsPerSem} credits/semester.
              </p>
            )}
          </Field>
        </div>

        {/* result */}
        <div className="md:col-span-2 rounded-xl border border-border bg-gradient-to-br from-blue-50 to-indigo-50 p-5">
          {alreadyThere ? (
            <div className="text-center">
              <p className="font-serif text-2xl font-semibold text-green-700">
                🎉 Goal already reached!
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Your current CGPA of <strong>{currentCgpa.toFixed(2)}</strong>{" "}
                already meets or exceeds your target of{" "}
                <strong>{target.toFixed(2)}</strong>.
              </p>
            </div>
          ) : !achievable ? (
            <div className="text-center">
              <p className="font-serif text-2xl font-semibold text-red-600">
                Not achievable
              </p>
              <p className="mt-2 text-sm text-gray-600">
                You'd need an average GPA of{" "}
                <strong>{requiredGpa.toFixed(2)}</strong> across {remainingSemesters}{" "}
                semester{remainingSemesters > 1 ? "s" : ""} — above the 4.00 maximum.
                {remainingSemesters > 1
                  ? " Add more remaining semesters or lower the target."
                  : " Consider lowering your target."}
              </p>
            </div>
          ) : (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground">
                GPA needed per remaining semester
              </p>
              <p className="mt-1 font-serif text-5xl font-bold text-blue-700">
                {requiredGpa.toFixed(2)}
              </p>
              <p className="mt-2 text-sm text-gray-600">
                Maintain an average of{" "}
                <strong>{requiredGpa.toFixed(2)}</strong> across your{" "}
                {remainingSemesters} remaining semester
                {remainingSemesters > 1 ? "s" : ""} ({remainingCredits} credits)
                to finish with a CGPA of <strong>{target.toFixed(2)}</strong>.
              </p>

              <div className="mt-5">
                <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                  <span>Current CGPA {currentCgpa.toFixed(2)}</span>
                  <span>Target {target.toFixed(2)}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/70">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs">
            <Stat label="Current CGPA" value={currentCgpa.toFixed(2)} />
            <Stat label="Earned credits" value={String(earnedCredits)} />
            <Stat label="Credits to go" value={String(remainingCredits)} />
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-white px-2 py-2">
      <p className="font-serif text-lg font-bold text-gray-800">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
