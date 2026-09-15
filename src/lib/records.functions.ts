import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const subjectSchema = z.object({
  subjectName: z.string(),
  creditHours: z.number(),
  marks: z.number(),
  gradePoint: z.number(),
  gradePoints: z.number(),
});

const gpaInput = z.object({
  department: z.string().min(1).max(80),
  semester: z.number().int().min(1).max(12),
  gpa: z.number().min(0).max(4),
  total_credits: z.number().int().min(0).max(60),
  total_grade_points: z.number().min(0).max(240),
  subjects: z.array(subjectSchema).min(1).max(30),
});

export const saveGpaRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => gpaInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("gpa_records")
      .insert({
        user_id: context.userId,
        department: data.department,
        semester: data.semester,
        gpa: data.gpa,
        total_credits: data.total_credits,
        total_grade_points: data.total_grade_points,
        subjects: data.subjects,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

const semesterSchema = z.object({
  semester: z.number().int().min(1).max(12),
  gpa: z.number().min(0).max(4),
  creditHours: z.number().int().min(0).max(60),
  gradePoints: z.number().min(0).max(240),
});

const cgpaInput = z.object({
  cgpa: z.number().min(0).max(4),
  total_credits: z.number().int().min(0).max(600),
  total_grade_points: z.number().min(0).max(2400),
  semesters: z.array(semesterSchema).min(1).max(12),
});

export const saveCgpaRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => cgpaInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error, data: row } = await context.supabase
      .from("cgpa_records")
      .insert({
        user_id: context.userId,
        cgpa: data.cgpa,
        total_credits: data.total_credits,
        total_grade_points: data.total_grade_points,
        semesters: data.semesters,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const listMyRecords = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [gpa, cgpa, profile] = await Promise.all([
      context.supabase
        .from("gpa_records")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("cgpa_records")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false }),
      context.supabase
        .from("profiles")
        .select("first_name,last_name,department,email,contact_number")
        .eq("id", context.userId)
        .maybeSingle(),
    ]);
    if (gpa.error) throw new Error(gpa.error.message);
    if (cgpa.error) throw new Error(cgpa.error.message);

    // Look up the student's department semester_count (for the target planner).
    let totalSemesters: number | null = null;
    const deptKey = (profile.data as { department?: string } | null)?.department;
    if (deptKey) {
      const { data: dept } = await context.supabase
        .from("departments")
        .select("semester_count")
        .eq("key", deptKey)
        .maybeSingle();
      if (dept) totalSemesters = (dept as { semester_count: number }).semester_count;
    }

    return {
      gpa: gpa.data ?? [],
      cgpa: cgpa.data ?? [],
      profile: profile.data ?? null,
      totalSemesters,
    };
  });

const deleteInput = z.object({
  kind: z.enum(["gpa", "cgpa"]),
  id: z.string().uuid(),
});

export const deleteRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deleteInput.parse(d))
  .handler(async ({ data, context }) => {
    const table = data.kind === "gpa" ? "gpa_records" : "cgpa_records";
    const { error } = await context.supabase
      .from(table)
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const updateProfile = z.object({
  first_name: z.string().max(80).nullable(),
  last_name: z.string().max(80).nullable(),
  department: z.string().max(80).nullable(),
});

export const upsertProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => updateProfile.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("profiles").upsert({
      id: context.userId,
      first_name: data.first_name,
      last_name: data.last_name,
      department: data.department,
      email: context.claims.email as string | undefined,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Safety net: makes sure a signed-in user (incl. Google) always has a profile row. */
export const ensureProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: existing } = await context.supabase
      .from("profiles")
      .select("id")
      .eq("id", context.userId)
      .maybeSingle();
    if (existing) return { created: false };

    const meta = (context.claims.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = String(meta['full_name'] ?? meta['name'] ?? "").trim();
    const [gFirst, ...gRest] = fullName.split(/\s+/u);
    const { error } = await context.supabase.from("profiles").insert({
      id: context.userId,
      first_name: (meta['first_name'] as string | undefined) ?? gFirst ?? null,
      last_name: (meta['last_name'] as string | undefined) ?? (gRest.join(" ") || null),
      email: (context.claims.email as string | undefined) ?? null,
      department: (meta['department'] as string | undefined) ?? null,
      contact_number: (meta['contact_number'] as string | undefined) ?? null,
    });
    // Row may already exist (signup trigger or a concurrent call) — that's fine.
    if (error && error.code !== "23505") throw new Error(error.message);
    return { created: !error };
  });

const accountUpdate = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  department: z.string().trim().min(1).max(80).nullable().optional(),
  contact_number: z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .refine(
      (v) => v === null || /^[+()\d][\d\s\-()]{5,19}$/u.test(v),
      "Enter a valid phone number",
    ),

});

export const updateMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => accountUpdate.parse(d))
  .handler(async ({ data, context }) => {
    const patch: {
      first_name: string;
      last_name: string;
      contact_number: string | null;
      updated_at: string;
      department?: string | null;
    } = {
      first_name: data.first_name,
      last_name: data.last_name,
      contact_number: data.contact_number,
      updated_at: new Date().toISOString(),
    };
    if (data.department !== undefined) patch.department = data.department;
    const { error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


export const analyzePerformance = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: rows, error } = await context.supabase
      .from("gpa_records")
      .select("semester,gpa,total_credits,total_grade_points,subjects")
      .eq("user_id", context.userId)
      .order("semester", { ascending: true });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    if (list.length === 0) {
      return { analysis: "Save at least one semester GPA to unlock AI performance insights." };
    }
    const totalCr = list.reduce((a, r) => a + Number(r.total_credits), 0);
    const totalGp = list.reduce((a, r) => a + Number(r.total_grade_points), 0);
    const cgpa = totalCr > 0 ? totalGp / totalCr : 0;

    type Sub = { subjectName: string; creditHours: number; marks: number; gradePoint: number };
    const allSubs: (Sub & { semester: number })[] = [];
    const summary = list
      .map((r) => {
        const subs = Array.isArray(r.subjects) ? (r.subjects as Sub[]) : [];
        subs.forEach((s) => allSubs.push({ ...s, semester: r.semester }));
        const line = subs
          .map(
            (s) =>
              `${s.subjectName} (${s.creditHours} cr): ${s.marks}% → GP ${Number(s.gradePoint).toFixed(2)}`,
          )
          .join("; ");
        return `Semester ${r.semester}: GPA ${Number(r.gpa).toFixed(2)}, ${r.total_credits} credits. Subjects — ${line}`;
      })
      .join("\n");

    const gpas = list.map((r) => Number(r.gpa));
    const best = list.reduce((a, b) => (Number(b.gpa) > Number(a.gpa) ? b : a));
    const worst = list.reduce((a, b) => (Number(b.gpa) < Number(a.gpa) ? b : a));
    const delta = gpas.length > 1 ? gpas[gpas.length - 1] - gpas[gpas.length - 2] : 0;
    const avg = gpas.reduce((a, b) => a + b, 0) / gpas.length;
    const sorted = allSubs.slice().sort((a, b) => a.gradePoint - b.gradePoint);
    const weakest = sorted.slice(0, 3);
    const strongest = sorted.slice(-3).reverse();
    const stats = [
      `Semesters completed: ${list.length}`,
      `Cumulative CGPA: ${cgpa.toFixed(2)} over ${totalCr} credits (${totalGp.toFixed(2)} grade points)`,
      `Average semester GPA: ${avg.toFixed(2)}`,
      `Latest semester change vs previous: ${delta >= 0 ? "+" : ""}${delta.toFixed(2)}`,
      `Best semester: ${best.semester} (${Number(best.gpa).toFixed(2)}) · Weakest semester: ${worst.semester} (${Number(worst.gpa).toFixed(2)})`,
      `Lowest-scoring subjects: ${weakest.map((s) => `${s.subjectName} sem ${s.semester} ${s.marks}%`).join(", ") || "n/a"}`,
      `Highest-scoring subjects: ${strongest.map((s) => `${s.subjectName} sem ${s.semester} ${s.marks}%`).join(", ") || "n/a"}`,
    ].join("\n");

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured");

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          {
            role: "system",
            content: [
              "You are an experienced, warm university academic advisor at the University of Sargodha.",
              "You analyse a student's semester-by-semester GPA record on a 4.00 scale and give precise, data-backed coaching.",
              "",
              "Reply in GitHub-flavoured Markdown using EXACTLY these sections and headings:",
              "",
              "## Overall verdict",
              "One or two sentences naming the trend (improving / declining / steady) with the exact CGPA and the GPA change.",
              "",
              "## Semester trend",
              "A markdown table with columns | Semester | GPA | Change | Note | — one row per semester, Change as +0.12 / -0.08 / — for the first.",
              "",
              "## Strengths",
              "2-4 bullets naming actual subjects/semesters with their marks or grade points.",
              "",
              "## Areas to improve",
              "2-4 bullets naming the specific weakest subjects with marks, and why they pull the CGPA down (mention credit hours where relevant).",
              "",
              "## Action plan for next semester",
              "4 numbered, concrete and doable steps (study habits, time allocation, subject priorities).",
              "",
              "## Target",
              "State realistically what GPA is needed next semester to move the CGPA up by ~0.10, and one encouraging closing line.",
              "",
              "Rules: always cite real numbers from the data, never invent subjects, keep the whole reply under 350 words, use bold for key figures, no emojis.",
            ].join("\n"),
          },
          {
            role: "user",
            content: `Key statistics:\n${stats}\n\nFull semester history:\n${summary}`,
          },
        ],
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      if (res.status === 429) throw new Error("AI is rate limited — try again in a minute.");
      if (res.status === 402) throw new Error("AI credits exhausted for this workspace.");
      throw new Error(`AI request failed [${res.status}]: ${body}`);
    }
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return { analysis: json.choices?.[0]?.message?.content ?? "" };
  });

