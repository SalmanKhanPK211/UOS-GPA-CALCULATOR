import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { ArrowRight, GraduationCap, Loader2, Trash2, Calculator, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { useCatalog } from "@/hooks/use-catalog";
import { useAuth } from "@/hooks/use-auth";
import { listMyRecords, deleteRecord } from "@/lib/records.functions";

const SHARE_IMAGE =
  "https://uoswabi-gpa-calculator.lovable.app/__l5e/assets-v1/90e6e749-e103-4c09-9c67-71c42974ff67/uos-calculator-share.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UOS GPA/CGPA Calculator — University of Swabi" },
      {
        name: "description",
        content:
          "Calculate your semester GPA and cumulative CGPA at University of Swabi. Save each semester, and it auto-fills your next CGPA.",
      },
      { property: "og:title", content: "UOS GPA/CGPA Calculator — University of Swabi" },
      { property: "og:description", content: "Calculate your semester GPA and cumulative CGPA at University of Swabi. Save each semester, and it auto-fills your next CGPA." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://uoswabi-gpa-calculator.lovable.app" },
      { property: "og:image", content: SHARE_IMAGE },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: SHARE_IMAGE },
    ],
    links: [{ rel: "canonical", href: "https://uoswabi-gpa-calculator.lovable.app" }],
  }),
  component: Home,
});

function Home() {
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-grow flex items-center justify-center pt-24 pb-16 px-4">
        {loading ? (
          <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
        ) : user ? (
          <Dashboard />
        ) : (
          <GuestLanding />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function GuestLanding() {
  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-xl overflow-hidden">
      <div className="md:flex">
        <div className="hidden md:block md:w-2/5 bg-scholarly">
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <GraduationCap className="mx-auto text-white mb-4 h-16 w-16" />
              <h2 className="text-white text-2xl font-bold mb-2">University of Swabi</h2>
              <p className="text-blue-200">GPA/CGPA Calculator</p>
            </div>
          </div>
        </div>
        <div className="w-full md:w-3/5 py-10 px-6 md:px-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Welcome</h1>
          <p className="text-gray-600 mb-6">
            Sign in to calculate your GPA, save each semester to your profile, and get an auto-generated CGPA when you're ready.
          </p>
          <ul className="space-y-2 text-sm text-gray-600 mb-8">
            <li className="flex items-start gap-2"><BookOpen className="mt-0.5 h-4 w-4 text-blue-600" /> Your department is set once at signup — no need to re-pick.</li>
            <li className="flex items-start gap-2"><Calculator className="mt-0.5 h-4 w-4 text-blue-600" /> Save each semester's GPA — next time we add it to your CGPA automatically.</li>
          </ul>
          <div className="flex gap-3">
            <Link to="/auth" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg text-center transition">
              Sign in / Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const navigate = useNavigate();
  const { displayName, user } = useAuth();
  const { departments, subjectsForDeptKey, semestersForKey, labelForKey, isLoading: catalogLoading } = useCatalog();
  const listFn = useServerFn(listMyRecords);
  const deleteFn = useServerFn(deleteRecord);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-records"],
    queryFn: () => listFn(),
    staleTime: 10_000,
  });

  const del = useMutation({
    mutationFn: (id: string) => deleteFn({ data: { kind: "gpa", id } }),
    onSuccess: () => {
      toast.success("Semester removed");
      qc.invalidateQueries({ queryKey: ["my-records"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed"),
  });

  const profileDept = data?.profile?.department ?? "";
  const savedGpa = data?.gpa ?? [];
  const savedSemesters = useMemo(() => savedGpa.map((r) => r.semester).sort((a, b) => a - b), [savedGpa]);

  const semesterCount = profileDept ? semestersForKey(profileDept) : 8;
  const allSemesters = Array.from({ length: semesterCount }, (_, i) => i + 1);
  const unsaved = allSemesters.filter((n) => !savedSemesters.includes(n));

  const [semester, setSemester] = useState<number | "">("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (semester === "" && unsaved.length > 0) setSemester(unsaved[0]);
  }, [unsaved, semester]);

  const subjects = useMemo(
    () => (profileDept ? subjectsForDeptKey(profileDept) : []),
    [profileDept, subjectsForDeptKey],
  );

  const canContinue = semester !== "" && subjects.length > 0 && Object.values(selected).some(Boolean);

  function handleContinue() {
    if (semester === "") return;
    const chosen = subjects.filter((s) => selected[s.name]);
    sessionStorage.setItem(
      "uos:gpa:setup",
      JSON.stringify({
        department: profileDept,
        semester: Number(semester),
        subjects: chosen.map((s) => ({ name: s.name, creditHours: s.credit_hours })),
      }),
    );
    navigate({ to: "/gpa" });
  }

  // Google users must complete their profile before using the app.
  const isGoogleUser =
    user?.app_metadata?.provider === "google" ||
    (user?.app_metadata?.providers as string[] | undefined)?.includes("google");
  const p = data?.profile;
  const needsOnboarding =
    !!isGoogleUser &&
    !!data &&
    (!p?.first_name?.trim() || !p?.last_name?.trim() || !p?.contact_number?.trim() || !p?.department);

  useEffect(() => {
    if (needsOnboarding) {
      sessionStorage.setItem("uos:onboarding", "1");
      navigate({ to: "/profile" });
    }
  }, [needsOnboarding, navigate]);

  if (isLoading || catalogLoading || needsOnboarding) {
    return <Loader2 className="h-6 w-6 animate-spin text-blue-600" />;
  }

  return (
    <div className="w-full max-w-5xl space-y-6">
      {/* Greeting */}
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-blue-600">
              {profileDept ? labelForKey(profileDept) : "Department not set"}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-gray-800">
              Hi{displayName ? `, ${displayName}` : ""} 👋
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {savedGpa.length === 0
                ? "Let's start with your first semester."
                : `You've saved ${savedGpa.length} semester${savedGpa.length === 1 ? "" : "s"}. Ready for the next one?`}
            </p>
          </div>
          {savedGpa.length >= 2 ? (
            <Link
              to="/cgpa"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition"
            >
              View my CGPA <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>

      {/* Saved semesters */}
      {savedGpa.length > 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Saved semesters</h2>
          <div className="space-y-2">
            {savedGpa
              .slice()
              .sort((a, b) => a.semester - b.semester)
              .map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-gray-200 p-3">
                  <div>
                    <p className="font-medium text-gray-800">Semester {r.semester}</p>
                    <p className="text-xs text-gray-500">
                      GPA {Number(r.gpa).toFixed(2)} · {r.total_credits} credits · {(r.subjects as unknown[]).length} subjects
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm(`Delete Semester ${r.semester}? You'll need to re-enter it.`)) del.mutate(r.id);
                    }}
                    className="rounded-md p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 transition"
                    aria-label={`Delete semester ${r.semester}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
          </div>
        </div>
      ) : null}

      {/* Next semester picker */}
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          {savedGpa.length === 0 ? "Calculate your first semester" : "Calculate next semester"}
        </h2>

        {unsaved.length === 0 ? (
          <p className="text-sm text-gray-500">You've saved every semester of your degree. 🎉</p>
        ) : !profileDept ? (
          <p className="text-sm text-red-600">
            No department linked to your profile. Please contact an admin.
          </p>
        ) : (
          <>
            <label className="block mb-4">
              <span className="text-sm font-medium text-gray-700">Semester</span>
              <select
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {unsaved.map((n) => (
                  <option key={n} value={n}>
                    Semester {n}
                  </option>
                ))}
              </select>
            </label>

            <label className="block mb-2">
              <span className="text-sm font-medium text-gray-700">Select subjects</span>
            </label>
            {subjects.length === 0 ? (
              <div className="bg-gray-50 p-4 rounded-lg text-sm text-gray-500 text-center">
                No subjects configured for your department yet. Ask an admin to add them.
              </div>
            ) : (
              <div className="max-h-72 overflow-y-auto bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                {subjects.map((s) => (
                  <label key={s.id} className="flex items-start gap-3 p-2 rounded cursor-pointer hover:bg-white">
                    <input
                      type="checkbox"
                      checked={!!selected[s.name]}
                      onChange={(e) => setSelected((p) => ({ ...p, [s.name]: e.target.checked }))}
                      className="mt-1 h-4 w-4 accent-blue-600"
                    />
                    <span className="flex-1 text-sm">
                      <span className="block font-medium text-gray-800">{s.name}</span>
                      <span className="text-xs text-gray-500">{s.credit_hours} credit hours</span>
                    </span>
                  </label>
                ))}
              </div>
            )}

            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Enter marks <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {/* Available departments only used implicitly. Keep the value so `departments` isn't unused. */}
      <span className="hidden">{departments.length}</span>
    </div>
  );
}
