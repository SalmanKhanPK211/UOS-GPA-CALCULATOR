import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { useAuth } from "@/hooks/use-auth";
import {
  listCatalog,
  upsertDepartment,
  deleteDepartment,
  upsertSubject,
  deleteSubject,
  bulkImportSubjects,
  adminListAll,
  adminUserDetail,
} from "@/lib/catalog.functions";
import { downloadSubjectTemplate, parseSubjectsFile } from "@/lib/subject-excel";
import { BookOpen, Building2, Download, Eye, FileSpreadsheet, Loader2, Plus, Save, ShieldCheck, Trash2, Upload, Users, X } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — UOS Calculator" }, { name: "robots", content: "noindex" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { isAdmin, loading } = useAuth();
  const catalogFn = useServerFn(listCatalog);
  const listAllFn = useServerFn(adminListAll);
  const qc = useQueryClient();

  const catalogQ = useQuery({ queryKey: ["catalog"], queryFn: () => catalogFn(), enabled: isAdmin });
  const usersQ = useQuery({ queryKey: ["admin-list"], queryFn: () => listAllFn(), enabled: isAdmin });

  const [tab, setTab] = useState<"departments" | "subjects" | "users">("departments");

  if (loading) return <Shell><p className="text-gray-600">Loading…</p></Shell>;
  if (!isAdmin)
    return (
      <Shell>
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-bold text-red-800">Admin access required</h2>
          <p className="mt-2 text-sm text-red-700">You must be an admin to view this page.</p>
          <Link to="/" className="mt-4 inline-block text-blue-600 hover:underline">Back to home</Link>
        </div>
      </Shell>
    );

  const departments = catalogQ.data?.departments ?? [];
  const subjects = catalogQ.data?.subjects ?? [];

  return (
    <Shell>
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-6 w-6 text-blue-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
          <p className="text-sm text-gray-500">Manage departments, subjects, and view all users.</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <nav className="flex gap-2 overflow-x-auto md:flex-col md:gap-1 md:rounded-lg md:border md:border-gray-200 md:bg-gray-50 md:p-2">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-blue-50 hover:text-blue-700"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          {tab === "departments" ? (
            <DepartmentsTab departments={departments} onChange={() => qc.invalidateQueries({ queryKey: ["catalog"] })} />
          ) : null}
          {tab === "subjects" ? (
            <SubjectsTab departments={departments} subjects={subjects} onChange={() => qc.invalidateQueries({ queryKey: ["catalog"] })} />
          ) : null}
          {tab === "users" ? <UsersTab data={usersQ.data} loading={usersQ.isLoading} /> : null}
        </section>
      </div>
    </Shell>
  );
}

const TABS = [
  { id: "departments" as const, label: "Departments", icon: Building2 },
  { id: "subjects" as const, label: "Subjects", icon: BookOpen },
  { id: "users" as const, label: "Users", icon: Users },
];

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteNav />
      <main className="flex-grow pt-24 pb-16 px-4">
        <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl p-6 md:p-10">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}


type Dept = { id: string; key: string; label: string; semester_count: number; sort_order: number };
type Subj = { id: string; department_id: string; name: string; credit_hours: number; sort_order: number };

function DepartmentsTab({ departments, onChange }: { departments: Dept[]; onChange: () => void }) {
  const saveFn = useServerFn(upsertDepartment);
  const delFn = useServerFn(deleteDepartment);
  const importFn = useServerFn(bulkImportSubjects);
  const [draft, setDraft] = useState({ key: "", label: "", semester_count: 8, sort_order: 999 });
  const [busy, setBusy] = useState(false);
  const [importDeptId, setImportDeptId] = useState<string>(departments[0]?.id ?? "");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [replaceSubjects, setReplaceSubjects] = useState(false);
  const [importing, setImporting] = useState(false);

  async function add() {
    if (!draft.key || !draft.label) return toast.error("Key and label are required");
    setBusy(true);
    try {
      const res = await saveFn({ data: draft });
      toast.success("Department added — now upload its subjects");
      setDraft({ key: "", label: "", semester_count: 8, sort_order: 999 });
      if (res?.id) setImportDeptId(res.id);
      onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setBusy(false); }
  }

  async function saveRow(d: Dept) {
    try { await saveFn({ data: { id: d.id, key: d.key, label: d.label, semester_count: d.semester_count, sort_order: d.sort_order } }); toast.success("Saved"); onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function del(id: string) {
    if (!confirm("Delete this department and all its subjects?")) return;
    try { await delFn({ data: { id } }); toast.success("Deleted"); onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  const importDepartment = departments.find((d) => d.id === importDeptId);

  async function downloadTemplate() {
    if (!importDepartment) return toast.error("Select a department first");
    try {
      await downloadSubjectTemplate(importDepartment.label);
      toast.success("Excel template downloaded");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not download template"); }
  }

  async function importSubjects() {
    if (!importDepartment || !importFile) return toast.error("Select a department and Excel file first");
    setImporting(true);
    try {
      const rows = await parseSubjectsFile(importFile);
      if (!confirm(`${replaceSubjects ? "Replace existing subjects with" : "Add"} ${rows.length} subject${rows.length === 1 ? "" : "s"} in ${importDepartment.label}?`)) return;
      await importFn({ data: { department_id: importDepartment.id, replace: replaceSubjects, rows } });
      toast.success(`${rows.length} subject${rows.length === 1 ? "" : "s"} imported successfully`);
      setImportFile(null);
      setReplaceSubjects(false);
      const input = document.getElementById("subject-excel-upload") as HTMLInputElement | null;
      if (input) input.value = "";
      onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Could not import subjects"); }
    finally { setImporting(false); }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="mb-3 flex items-center gap-2 font-semibold text-gray-800"><Plus className="h-4 w-4" /> Add department</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_100px_100px_auto]">
          <input placeholder="key (e.g. computer-science)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value.toLowerCase().replace(/\s+/g, "-") })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input placeholder="Label (e.g. Computer Science)" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input type="number" min={1} max={12} placeholder="Sems" value={draft.semester_count} onChange={(e) => setDraft({ ...draft, semester_count: Number(e.target.value) || 8 })} className="rounded border border-gray-300 px-3 py-2 text-sm text-center" />
          <input type="number" min={0} placeholder="Order" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} className="rounded border border-gray-300 px-3 py-2 text-sm text-center" />
          <button onClick={add} disabled={busy} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{busy ? "Adding…" : "Add"}</button>
        </div>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-gray-800"><FileSpreadsheet className="h-4 w-4 text-blue-700" /> Import subjects from Excel</h3>
            <p className="mt-1 text-sm text-gray-600">Download the template, fill in the subjects, then upload it for the selected department.</p>
          </div>
          <button onClick={downloadTemplate} disabled={!importDepartment} className="inline-flex items-center gap-2 rounded border border-blue-300 bg-white px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"><Download className="h-4 w-4" /> Template</button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto] md:items-end">
          <label className="text-sm font-medium text-gray-700">Department
            <select value={importDeptId} onChange={(e) => setImportDeptId(e.target.value)} className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-2 font-normal">
              {departments.length === 0 ? <option value="">No departments yet</option> : null}
              {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-gray-700">Excel file
            <input id="subject-excel-upload" type="file" accept=".xlsx,.xls,.csv" onChange={(e) => setImportFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full rounded border border-gray-300 bg-white px-3 py-1.5 text-sm font-normal file:mr-3 file:rounded file:border-0 file:bg-blue-100 file:px-3 file:py-1 file:text-sm file:font-medium file:text-blue-700" />
          </label>
          <button onClick={importSubjects} disabled={importing || !importFile || !importDepartment} className="inline-flex items-center justify-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{importing ? "Importing…" : "Import subjects"}</button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-gray-600"><input type="checkbox" checked={replaceSubjects} onChange={(e) => setReplaceSubjects(e.target.checked)} /> Replace this department’s existing subjects</label>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Key</th>
              <th className="px-4 py-2">Label</th>
              <th className="w-20 px-4 py-2">Semesters</th>
              <th className="w-20 px-4 py-2">Order</th>
              <th className="w-32 px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {departments.map((d) => <DeptRow key={d.id} dept={d} onSave={saveRow} onDelete={del} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function DeptRow({ dept, onSave, onDelete }: { dept: Dept; onSave: (d: Dept) => void; onDelete: (id: string) => void }) {
  const [d, setD] = useState(dept);
  const dirty = JSON.stringify(d) !== JSON.stringify(dept);
  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-2"><input value={d.key} onChange={(e) => setD({ ...d, key: e.target.value })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm" /></td>
      <td className="px-4 py-2"><input value={d.label} onChange={(e) => setD({ ...d, label: e.target.value })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm" /></td>
      <td className="px-4 py-2"><input type="number" min={1} max={12} value={d.semester_count} onChange={(e) => setD({ ...d, semester_count: Number(e.target.value) || 8 })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-center" /></td>
      <td className="px-4 py-2"><input type="number" min={0} value={d.sort_order} onChange={(e) => setD({ ...d, sort_order: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-center" /></td>
      <td className="px-4 py-2 text-right space-x-1">
        <button onClick={() => onSave(d)} disabled={!dirty} className="inline-flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs disabled:opacity-40"><Save className="h-3 w-3" /></button>
        <button onClick={() => onDelete(d.id)} className="inline-flex items-center gap-1 rounded bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs"><Trash2 className="h-3 w-3" /></button>
      </td>
    </tr>
  );
}

function SubjectsTab({ departments, subjects, onChange }: { departments: Dept[]; subjects: Subj[]; onChange: () => void }) {
  const saveFn = useServerFn(upsertSubject);
  const delFn = useServerFn(deleteSubject);
  const [deptFilter, setDeptFilter] = useState<string>(departments[0]?.id ?? "");
  const [draft, setDraft] = useState({ name: "", credit_hours: 3, sort_order: 999 });

  const filtered = useMemo(() => subjects.filter((s) => s.department_id === deptFilter), [subjects, deptFilter]);

  async function add() {
    if (!deptFilter || !draft.name) return toast.error("Pick department and enter a subject name");
    try { await saveFn({ data: { department_id: deptFilter, ...draft } }); toast.success("Subject added"); setDraft({ name: "", credit_hours: 3, sort_order: 999 }); onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function saveRow(s: Subj) {
    try { await saveFn({ data: s }); toast.success("Saved"); onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }
  async function del(id: string) {
    if (!confirm("Delete this subject?")) return;
    try { await delFn({ data: { id } }); toast.success("Deleted"); onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-medium text-gray-700">Department</label>
        <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm">
          {departments.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
        </select>
      </div>

      <div className="rounded-lg border border-gray-200 p-4">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Plus className="h-4 w-4" /> Add subject</h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_100px_100px_auto]">
          <input placeholder="Subject name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input type="number" min={1} max={6} placeholder="Credits" value={draft.credit_hours} onChange={(e) => setDraft({ ...draft, credit_hours: Number(e.target.value) || 3 })} className="rounded border border-gray-300 px-3 py-2 text-sm text-center" />
          <input type="number" min={0} placeholder="Order" value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) || 0 })} className="rounded border border-gray-300 px-3 py-2 text-sm text-center" />
          <button onClick={add} className="rounded bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-sm font-medium">Add</button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2 w-24">Credits</th>
              <th className="px-4 py-2 w-24">Order</th>
              <th className="px-4 py-2 w-32"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => <SubjRow key={s.id} subj={s} onSave={saveRow} onDelete={del} />)}
            {filtered.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-500">No subjects yet for this department.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubjRow({ subj, onSave, onDelete }: { subj: Subj; onSave: (s: Subj) => void; onDelete: (id: string) => void }) {
  const [s, setS] = useState(subj);
  const dirty = JSON.stringify(s) !== JSON.stringify(subj);
  return (
    <tr className="border-t border-gray-200">
      <td className="px-4 py-2"><input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm" /></td>
      <td className="px-4 py-2"><input type="number" min={1} max={6} value={s.credit_hours} onChange={(e) => setS({ ...s, credit_hours: Number(e.target.value) || 3 })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-center" /></td>
      <td className="px-4 py-2"><input type="number" min={0} value={s.sort_order} onChange={(e) => setS({ ...s, sort_order: Number(e.target.value) || 0 })} className="w-full rounded border border-gray-200 px-2 py-1 text-sm text-center" /></td>
      <td className="px-4 py-2 text-right space-x-1">
        <button onClick={() => onSave(s)} disabled={!dirty} className="inline-flex items-center rounded bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 text-xs disabled:opacity-40"><Save className="h-3 w-3" /></button>
        <button onClick={() => onDelete(s.id)} className="inline-flex items-center rounded bg-red-600 hover:bg-red-700 text-white px-2 py-1 text-xs"><Trash2 className="h-3 w-3" /></button>
      </td>
    </tr>
  );
}

type AdminData = { profiles: Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null; contact_number: string | null; department: string | null; created_at: string }>; gpa: Array<{ id: string; user_id: string; department: string; semester: number; gpa: number; total_credits: number; created_at: string }>; cgpa: Array<{ id: string; user_id: string; cgpa: number; total_credits: number; created_at: string }> };

function UsersTab({ data, loading }: { data: AdminData | undefined; loading: boolean }) {
  const [openUser, setOpenUser] = useState<string | null>(null);
  if (loading) return <div className="flex items-center gap-2 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading users…</div>;
  if (!data) return <p className="text-gray-500">No data.</p>;
  const gpaByUser = new Map<string, number>();
  const cgpaByUser = new Map<string, number>();
  for (const r of data.gpa) gpaByUser.set(r.user_id, (gpaByUser.get(r.user_id) ?? 0) + 1);
  for (const r of data.cgpa) cgpaByUser.set(r.user_id, (cgpaByUser.get(r.user_id) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <Stat label="Users" value={data.profiles.length} />
        <Stat label="GPA records" value={data.gpa.length} />
        <Stat label="CGPA records" value={data.cgpa.length} />
      </div>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Email</th>
              <th className="px-4 py-2">Contact</th>
              <th className="px-4 py-2">Department</th>
              <th className="px-4 py-2">GPA saves</th>
              <th className="px-4 py-2">CGPA saves</th>
              <th className="px-4 py-2">Joined</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data.profiles.map((p) => (
              <tr key={p.id} className="border-t border-gray-200">
                <td className="px-4 py-2">{[p.first_name, p.last_name].filter(Boolean).join(" ") || "—"}</td>
                <td className="px-4 py-2 text-gray-600">
                  {p.email ? <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a> : "—"}
                </td>
                <td className="px-4 py-2 text-gray-600">
                  {p.contact_number ? <a href={`tel:${p.contact_number}`} className="hover:underline">{p.contact_number}</a> : "—"}
                </td>
                <td className="px-4 py-2 text-gray-600">{p.department ?? "—"}</td>
                <td className="px-4 py-2">{gpaByUser.get(p.id) ?? 0}</td>
                <td className="px-4 py-2">{cgpaByUser.get(p.id) ?? 0}</td>
                <td className="px-4 py-2 text-gray-500">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => setOpenUser(p.id)}
                    className="inline-flex items-center gap-1 rounded bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-xs font-medium text-white"
                  >
                    <Eye className="h-3 w-3" /> View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {openUser ? <UserDetailModal userId={openUser} onClose={() => setOpenUser(null)} /> : null}
    </div>
  );
}

type SubjRec = { subjectName?: string; creditHours?: number; marks?: number; gradePoint?: number; gradePoints?: number; name?: string; credit_hours?: number; obtained?: number; total?: number; grade?: string };

function subjName(s: SubjRec) { return s.subjectName ?? s.name ?? "—"; }
function subjCredits(s: SubjRec) { return s.creditHours ?? s.credit_hours ?? 0; }
function subjObtained(s: SubjRec) { return s.marks ?? s.obtained ?? null; }
function subjTotal(s: SubjRec) { return s.marks != null ? 100 : (s.total ?? null); }
function subjGrade(s: SubjRec) {
  if (s.grade) return s.grade;
  if (s.gradePoint == null) return "—";
  if (s.gradePoint >= 4) return "A";
  if (s.gradePoint >= 3) return "B";
  if (s.gradePoint >= 2) return "C";
  return "F";
}

function UserDetailModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const detailFn = useServerFn(adminUserDetail);
  const q = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => detailFn({ data: { userId } }),
  });
  const p = q.data?.profile;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={onClose}>
      <div className="mt-10 w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {p ? [p.first_name, p.last_name].filter(Boolean).join(" ") || "Unnamed user" : "User account"}
            </h3>
            {p ? (
              <p className="text-sm text-gray-500">
                {p.email ?? "no email"} · {p.contact_number ?? "no contact"} · {p.department ?? "no department"}
              </p>
            ) : null}
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-700"><X className="h-5 w-5" /></button>
        </div>

        {q.isLoading ? (
          <div className="flex items-center gap-2 py-8 text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading account…</div>
        ) : q.error ? (
          <p className="py-6 text-sm text-red-600">{q.error instanceof Error ? q.error.message : "Failed to load account"}</p>
        ) : (
          <div className="space-y-6">
            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500">Semester records</h4>
              {q.data && q.data.gpa.length > 0 ? (
                <div className="space-y-3">
                  {q.data.gpa.map((r) => {
                    const subs = Array.isArray(r.subjects) ? (r.subjects as unknown as SubjRec[]) : [];
                    const semObtained = subs.reduce((a, s) => a + (subjObtained(s) ?? 0), 0);
                    const semTotal = subs.reduce((a, s) => a + (subjTotal(s) ?? 0), 0);
                    return (
                      <div key={r.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                          <span className="font-semibold text-gray-800">Semester {r.semester}</span>
                          <span className="text-blue-700 font-bold">GPA {Number(r.gpa).toFixed(2)}</span>
                          <span className="text-gray-500">
                            Marks {semObtained}/{semTotal} · {r.total_credits} credits · {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="text-left text-gray-500">
                              <tr><th className="py-1 pr-3">Subject</th><th className="py-1 pr-3">Credits</th><th className="py-1 pr-3">Obtained</th><th className="py-1 pr-3">Total</th><th className="py-1 pr-3">Grade Point</th><th className="py-1">Grade</th></tr>
                            </thead>
                            <tbody>
                              {subs.map((s, i) => (
                                <tr key={i} className="border-t border-gray-100">
                                  <td className="py-1 pr-3 text-gray-800">{subjName(s)}</td>
                                  <td className="py-1 pr-3">{subjCredits(s) || "—"}</td>
                                  <td className="py-1 pr-3">{subjObtained(s) ?? "—"}</td>
                                  <td className="py-1 pr-3">{subjTotal(s) ?? "—"}</td>
                                  <td className="py-1 pr-3">{s.gradePoint != null ? s.gradePoint.toFixed(2) : "—"}</td>
                                  <td className="py-1">{subjGrade(s)}</td>
                                </tr>
                              ))}
                              <tr className="border-t border-gray-300 font-semibold text-gray-800">
                                <td className="py-1 pr-3">Total</td>
                                <td className="py-1 pr-3">{r.total_credits}</td>
                                <td className="py-1 pr-3">{semObtained}</td>
                                <td className="py-1 pr-3">{semTotal}</td>
                                <td className="py-1 pr-3" colSpan={2}>GPA {Number(r.gpa).toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-gray-500">No semester records saved.</p>
              )}
            </section>

            <section>
              <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500">CGPA records</h4>
              {q.data && q.data.cgpa.length > 0 ? (
                <ul className="space-y-1 text-sm">
                  {q.data.cgpa.map((c) => (
                    <li key={c.id} className="flex justify-between rounded border border-gray-200 px-3 py-2">
                      <span className="font-semibold text-blue-800">CGPA {Number(c.cgpa).toFixed(2)}</span>
                      <span className="text-gray-500">{c.total_credits} credits · {new Date(c.created_at).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              ) : q.data && q.data.gpa.length > 0 ? (
                (() => {
                  const totalCr = q.data.gpa.reduce((a, r) => a + r.total_credits, 0);
                  const totalGp = q.data.gpa.reduce((a, r) => a + Number(r.total_grade_points), 0);
                  const cgpa = totalCr > 0 ? totalGp / totalCr : 0;
                  return (
                    <p className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm">
                      Overall CGPA from saved semesters: <span className="font-bold text-blue-800">{cgpa.toFixed(2)}</span>
                      <span className="text-gray-500"> · {totalCr} credits across {q.data.gpa.length} semester{q.data.gpa.length === 1 ? "" : "s"}</span>
                    </p>
                  );
                })()
              ) : (
                <p className="text-sm text-gray-500">No CGPA records saved.</p>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-blue-50 p-4 text-center">
      <div className="text-2xl font-bold text-blue-800">{value}</div>
      <div className="text-xs uppercase text-blue-600 mt-1">{label}</div>
    </div>
  );
}
