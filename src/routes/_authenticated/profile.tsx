import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { Loader2, Save, KeyRound, UserRound } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { SiteNav, SiteFooter } from "@/components/SiteNav";
import { supabase } from "@/integrations/supabase/client";
import { listMyRecords, updateMyAccount } from "@/lib/records.functions";
import { useAuth } from "@/hooks/use-auth";
import { useCatalog } from "@/hooks/use-catalog";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "My Profile — UOS Grades" },
      { name: "description", content: "Update your name, contact number and password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const listFn = useServerFn(listMyRecords);
  const updateFn = useServerFn(updateMyAccount);
  const qc = useQueryClient();

  const [onboarding, setOnboarding] = useState(false);
  useEffect(() => {
    setOnboarding(sessionStorage.getItem("uos:onboarding") === "1");
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["my-records"],
    queryFn: () => listFn(),
    enabled: !!user,
  });

  const { departments, isLoading: catLoading } = useCatalog();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [department, setDepartment] = useState("");
  const [saving, setSaving] = useState(false);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (data?.profile) {
      setFirstName(data.profile.first_name ?? "");
      setLastName(data.profile.last_name ?? "");
      setContact(data.profile.contact_number ?? "");
      setDepartment(data.profile.department ?? "");
    }
  }, [data?.profile]);



  async function saveInfo(e: React.FormEvent) {
    e.preventDefault();
    if (onboarding && (!firstName.trim() || !lastName.trim() || !contact.trim() || !department)) {
      toast.error("Please complete all fields to continue");
      return;
    }
    setSaving(true);
    try {
      await updateFn({
        data: {
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          contact_number: contact.trim() ? contact.trim() : null,
          department: department || null,
        },
      });

      // keep auth metadata in sync so nav's "Hi, X" updates immediately
      await supabase.auth.updateUser({
        data: { first_name: firstName.trim(), last_name: lastName.trim() },
      });
      toast.success("Profile updated");
      await qc.invalidateQueries({ queryKey: ["my-records"] });
      if (onboarding) {
        sessionStorage.removeItem("uos:onboarding");
        setOnboarding(false);
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    if (pw !== pw2) {
      toast.error("Passwords do not match");
      return;
    }
    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      setPw2("");
      toast.success("Password updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-grow px-4 pt-24 pb-10 md:pb-14">
        <header className="mb-8">
          <p className="text-sm font-medium text-blue-600">Account</p>
          <h1 className="mt-1 font-serif text-4xl font-semibold tracking-tight text-gray-800 md:text-5xl">
            {onboarding ? "Complete your profile" : "My Profile"}
          </h1>
          <p className="mt-2 text-muted-foreground">
            {onboarding
              ? "Welcome! Add your name, contact number and department to start calculating."
              : "Update your personal information and password."}
          </p>
        </header>

        {onboarding ? (
          <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
            These details are required before you can use the calculator.
          </div>
        ) : null}


        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : (
          <div className="space-y-8">
            <form
              onSubmit={saveInfo}
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <UserRound className="h-5 w-5 text-blue-600" /> Personal information
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">First name</span>
                  <input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Last name</span>
                  <input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Email</span>
                  <input
                    value={data?.profile?.email ?? user?.email ?? ""}
                    disabled
                    className="w-full rounded-md border border-input bg-muted px-3 py-2 text-sm text-muted-foreground"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Department</span>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    disabled={catLoading}
                    required={onboarding}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="">
                      {catLoading ? "Loading…" : "Select your department"}
                    </option>
                    {departments.map((d) => (
                      <option key={d.key} value={d.key}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm md:col-span-2">
                  <span className="mb-1 block font-medium text-gray-700">Contact number</span>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    required={onboarding}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>

              </div>

              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" /> {saving ? "Saving..." : onboarding ? "Save & continue" : "Save changes"}
                </button>
              </div>
            </form>

            <form
              onSubmit={changePassword}
              className="rounded-2xl border border-border bg-white p-6 shadow-card"
            >
              <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-800">
                <KeyRound className="h-5 w-5 text-blue-600" /> Change password
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">New password</span>
                  <input
                    type="password"
                    value={pw}
                    onChange={(e) => setPw(e.target.value)}
                    minLength={8}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm">
                  <span className="mb-1 block font-medium text-gray-700">Confirm password</span>
                  <input
                    type="password"
                    value={pw2}
                    onChange={(e) => setPw2(e.target.value)}
                    minLength={8}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Use at least 8 characters. You'll stay signed in after changing it.
              </p>
              <div className="mt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={pwSaving}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <KeyRound className="h-4 w-4" /> {pwSaving ? "Updating..." : "Update password"}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
