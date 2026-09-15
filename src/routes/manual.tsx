import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  UserPlus,
  LogIn,
  Calculator,
  Save,
  FileDown,
  History as HistoryIcon,
  KeyRound,
  HelpCircle,
} from "lucide-react";
import { SiteNav, SiteFooter } from "@/components/SiteNav";

export const Route = createFileRoute("/manual")({
  head: () => ({
    meta: [
      { title: "User Manual — UOS Grades" },
      {
        name: "description",
        content:
          "Step-by-step user manual for the University of Swabi GPA and CGPA calculator: signup, GPA calculation, saving semesters, CGPA reports and PDF exports.",
      },
    ],
  }),
  component: ManualPage,
});

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof BookOpen;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-white p-6 shadow-card">
      <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold text-gray-800">
        <Icon className="h-5 w-5 text-blue-600" /> {title}
      </h2>
      <div className="space-y-2 text-sm text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

function ManualPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-4xl flex-grow px-4 pt-24 pb-10 md:pb-14">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600">Help &amp; guide</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-gray-800 md:text-5xl">
            User Manual
          </h1>
          <p className="mt-2 text-muted-foreground">
            Everything you need to know to use the UOS GPA &amp; CGPA calculator effectively.
          </p>
        </header>

        <div className="space-y-6">
          <Section icon={BookOpen} title="1. What this app does">
            <p>
              The UOS Calculator lets University of Swabi students compute their{" "}
              <strong>Semester GPA</strong> and <strong>Cumulative GPA (CGPA)</strong>{" "}
              using the official UOS grading formula, save each semester to their
              account, and download well-formatted PDF reports.
            </p>
            <p>
              Grade point formula:{" "}
              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-xs">
                below 50 → 0.00 · 50–89 → 2.00 + (marks − 50) × 0.05 · 90+ → 4.00
              </span>
            </p>
          </Section>

          <Section icon={UserPlus} title="2. Create an account">
            <p>You can sign up in two ways:</p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Continue with Google</strong> — fastest. On your first
                sign-in you'll be redirected to your profile page to enter your
                first name, last name, contact number, and department before you
                can use the calculator.
              </li>
              <li>
                <strong>Email &amp; password</strong> — enter your first name, last
                name, email, department, contact number and a password of at least
                8 characters, then confirm your email address if asked.
              </li>
            </ul>
            <p className="text-muted-foreground">
              Your department matters: it controls which subjects and semesters are
              auto-loaded for you. Google users can set or change it on the{" "}
              <Link to="/profile" className="text-blue-600 hover:underline">Profile</Link> page.
            </p>
          </Section>

          <Section icon={LogIn} title="3. Sign in and Dashboard">
            <p>
              After signing in you'll land on the <strong>Dashboard</strong>. It shows:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Your current CGPA and saved semester history.</li>
              <li>
                Interactive charts: a <strong>GPA/CGPA trend line</strong> and a{" "}
                <strong>per-semester bar chart</strong>. Click a semester to see its
                subject breakdown.
              </li>
              <li>
                The <strong>AI Performance Coach</strong> — an AI analysis of whether
                your performance is improving or declining, with concrete suggestions
                for next semester.
              </li>
              <li>
                The <strong>Target CGPA Planner</strong> — set a goal CGPA and see the
                average GPA you need in your remaining semesters, and whether the
                target is still achievable.
              </li>
            </ul>
            <p className="text-muted-foreground">
              Only unsaved semester numbers appear in the picker — one saved GPA
              record per semester.
            </p>
          </Section>

          <Section icon={Calculator} title="4. Calculate your Semester GPA">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Pick the next semester on the dashboard.</li>
              <li>
                Check the auto-loaded subjects for that semester. You can add or
                remove rows if your enrolment differs.
              </li>
              <li>Enter marks out of 100 in each row. Grade points update live.</li>
              <li>
                Your <strong>Semester GPA</strong> appears in the side panel along
                with total credits and grade points.
              </li>
            </ol>
          </Section>

          <Section icon={Save} title="5. Save the semester">
            <p>
              Press <strong>Save to history</strong> to store this semester under your
              profile. The app then takes you to the CGPA page where all your saved
              semesters are combined automatically.
            </p>
            <p className="text-muted-foreground">
              Each semester can be saved once. To recalculate, delete the semester
              from <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>{" "}
              first.
            </p>
          </Section>

          <Section icon={FileDown} title="6. Download PDF reports">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong>Semester GPA PDF</strong> — contains only the current
                semester's subjects, credit hours, marks obtained, total marks and
                grade points.
              </li>
              <li>
                <strong>CGPA PDF</strong> — contains every semester you've saved
                from semester 1 to your current one, with a per-semester subject
                breakdown and overall totals (CGPA, credits, obtained/actual marks,
                percentage).
              </li>
            </ul>
          </Section>

          <Section icon={HistoryIcon} title="7. Dashboard records">
            <p>
              The <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>{" "}
              lists every saved semester and CGPA snapshot with their GPAs, credits
              and dates. You can delete any record if you need to redo it, then
              recalculate and save it again.
            </p>
          </Section>

          <Section icon={KeyRound} title="8. Update profile & password">
            <p>
              Visit <Link to="/profile" className="text-blue-600 hover:underline">My Profile</Link>{" "}
              to update your first name, last name, contact number and department,
              or to change your password. Your email address cannot be changed.
            </p>
            <p className="text-muted-foreground">
              If you signed in with Google for the first time, you must complete
              your profile (name, contact number, department) before continuing —
              you'll be sent there automatically.
            </p>
          </Section>

          <Section icon={HelpCircle} title="9. Tips & troubleshooting">
            <ul className="list-disc space-y-1 pl-5">
              <li>Marks must be between 0 and 100. Below 50 counts as 0 grade points.</li>
              <li>
                If your CGPA looks slightly off, ensure every semester is saved and
                each subject uses the correct credit hours.
              </li>
              <li>
                PDFs open in a new tab or download depending on your browser
                settings — check your Downloads folder.
              </li>
              <li>
                Forgot which semester you saved? Open{" "}
                <Link to="/dashboard" className="text-blue-600 hover:underline">Dashboard</Link>.
              </li>
            </ul>
          </Section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
