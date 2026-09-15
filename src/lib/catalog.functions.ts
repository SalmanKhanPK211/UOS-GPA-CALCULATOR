import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function publicClient() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
  return createClient<Database>(process.env.SUPABASE_URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

export const listCatalog = createServerFn({ method: "GET" }).handler(async () => {
  const sb = publicClient();
  const [d, s] = await Promise.all([
    sb.from("departments").select("id,key,label,semester_count,sort_order").order("sort_order"),
    sb.from("subjects").select("id,department_id,name,credit_hours,sort_order").order("sort_order"),
  ]);
  if (d.error) throw new Error(d.error.message);
  if (s.error) throw new Error(s.error.message);
  return { departments: d.data ?? [], subjects: s.data ?? [] };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(context: any) {
  const { data, error } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden — admin only");
}

const deptInput = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/, "lowercase, digits, hyphens only"),
  label: z.string().min(1).max(120),
  semester_count: z.number().int().min(1).max(12),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => deptInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("departments").update({
        key: data.key, label: data.label, semester_count: data.semester_count, sort_order: data.sort_order,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("departments").insert({
      key: data.key, label: data.label, semester_count: data.semester_count, sort_order: data.sort_order,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteDepartment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("departments").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const subjInput = z.object({
  id: z.string().uuid().optional(),
  department_id: z.string().uuid(),
  name: z.string().min(1).max(160),
  credit_hours: z.number().int().min(1).max(6),
  sort_order: z.number().int().min(0).max(9999).default(0),
});

export const upsertSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => subjInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.id) {
      const { error } = await context.supabase.from("subjects").update({
        department_id: data.department_id, name: data.name, credit_hours: data.credit_hours, sort_order: data.sort_order,
      }).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: row, error } = await context.supabase.from("subjects").insert({
      department_id: data.department_id, name: data.name, credit_hours: data.credit_hours, sort_order: data.sort_order,
    }).select("id").single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const deleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from("subjects").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const bulkInput = z.object({
  department_id: z.string().uuid(),
  replace: z.boolean().default(false),
  rows: z
    .array(
      z.object({
        name: z.string().min(1).max(160),
        credit_hours: z.number().int().min(1).max(6),
        sort_order: z.number().int().min(0).max(9999),
      }),
    )
    .min(1)
    .max(500),
});

export const bulkImportSubjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => bulkInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    if (data.replace) {
      const { error } = await context.supabase.from("subjects").delete().eq("department_id", data.department_id);
      if (error) throw new Error(error.message);
    }
    const { error } = await context.supabase
      .from("subjects")
      .insert(data.rows.map((r) => ({ ...r, department_id: data.department_id })));
    if (error) throw new Error(error.message);
    return { inserted: data.rows.length };
  });


export const adminListAll = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const [profiles, gpa, cgpa] = await Promise.all([
      context.supabase.from("profiles").select("id,first_name,last_name,email,contact_number,department,created_at").order("created_at", { ascending: false }),
      context.supabase.from("gpa_records").select("id,user_id,department,semester,gpa,total_credits,created_at").order("created_at", { ascending: false }).limit(500),
      context.supabase.from("cgpa_records").select("id,user_id,cgpa,total_credits,created_at").order("created_at", { ascending: false }).limit(500),
    ]);
    if (profiles.error) throw new Error(profiles.error.message);
    if (gpa.error) throw new Error(gpa.error.message);
    if (cgpa.error) throw new Error(cgpa.error.message);
    return { profiles: profiles.data ?? [], gpa: gpa.data ?? [], cgpa: cgpa.data ?? [] };
  });

export const adminUserDetail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [profile, gpa, cgpa] = await Promise.all([
      context.supabase.from("profiles").select("id,first_name,last_name,email,contact_number,department,created_at").eq("id", data.userId).maybeSingle(),
      context.supabase.from("gpa_records").select("id,department,semester,gpa,total_credits,total_grade_points,subjects,created_at").eq("user_id", data.userId).order("semester", { ascending: true }),
      context.supabase.from("cgpa_records").select("id,cgpa,total_credits,total_grade_points,semesters,created_at").eq("user_id", data.userId).order("created_at", { ascending: true }),
    ]);
    if (profile.error) throw new Error(profile.error.message);
    if (gpa.error) throw new Error(gpa.error.message);
    if (cgpa.error) throw new Error(cgpa.error.message);
    return { profile: profile.data, gpa: gpa.data ?? [], cgpa: cgpa.data ?? [] };
  });

export const getMyRole = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role);
    return { isAdmin: roles.includes("admin"), roles };
  });
