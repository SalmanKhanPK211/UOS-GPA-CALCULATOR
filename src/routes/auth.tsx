import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useCatalog } from "@/hooks/use-catalog";


export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — UOS Grades" },
      { name: "description", content: "Sign in or create a UOS Grades account to save your GPA and CGPA history." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";
const PHONE_RE = /^03\d{2}-?\d{7}$/;

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);


  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setForgotBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent — check your inbox");
      setForgotOpen(false);
      setForgotEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset email");
    } finally {
      setForgotBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && contact.trim() && !PHONE_RE.test(contact.trim())) {
      return toast.error("Contact number must be like 03XX-XXXXXXX (11 digits)");
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              first_name: firstName,
              last_name: lastName,
              contact_number: contact.trim() || null,
            },
          },
        });
        if (error) throw error;
        toast.success("Account created. Please set your department in your profile.");
        navigate({ to: "/profile" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setLoading(true);
    try {
      const res = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (res.error) throw res.error;
      if (!res.redirected) {
        toast.success("Signed in with Google");
        navigate({ to: "/" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }



  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-scholarly text-primary-foreground shadow-scholarly">
            <GraduationCap className="h-6 w-6" />
          </span>
          <span className="font-serif text-2xl font-semibold">UOS Grades</span>
        </Link>

        <div className="rounded-2xl border border-border bg-card p-8 shadow-scholarly">
          <div className="mb-6 flex rounded-lg bg-muted p-1 text-sm">
            <button
              onClick={() => setMode("signin")}
              className={`flex-1 rounded-md py-2 font-medium transition ${mode === "signin" ? "bg-background shadow-card" : "text-muted-foreground"}`}
            >
              Sign in
            </button>
            <button
              onClick={() => setMode("signup")}
              className={`flex-1 rounded-md py-2 font-medium transition ${mode === "signup" ? "bg-background shadow-card" : "text-muted-foreground"}`}
            >
              Create account
            </button>
          </div>

          <h1 className="font-serif text-2xl font-semibold">
            {mode === "signin" ? "Welcome back" : "Join UOS Grades"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to access your saved calculations."
              : "Create a free account. You can set your department in your profile."}
          </p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50"
          >
            <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.5 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.4 13.2 17.7 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.3 5.6-4.9 7.3l7.6 5.9c4.4-4.1 7.3-10.1 7.3-17.7z"/>
              <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C1 16.3 0 20 0 24s1 7.7 2.6 10.8l7.8-6.1z"/>
              <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2.1 1.4-4.9 2.3-8.3 2.3-6.3 0-11.6-3.7-13.6-9.8l-7.8 6.1C6.5 42.6 14.6 48 24 48z"/>
            </svg>
            Continue with Google
          </button>

          <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or {mode === "signin" ? "sign in with email" : "use email"} <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-xs font-medium">First name</span>
                    <input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium">Last name</span>
                    <input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required
                      className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium">Contact number <span className="text-muted-foreground">(optional)</span></span>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    pattern="^03\d{2}-?\d{7}$"
                    className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </label>
              </>
            ) : null}

            <label className="block">
              <span className="text-xs font-medium">Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Password</span>
                {mode === "signin" ? (
                  <button
                    type="button"
                    onClick={() => { setForgotEmail(email); setForgotOpen(true); }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                ) : null}
              </div>
              <input
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-card transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            {mode === "signin" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
              className="font-medium text-primary hover:underline"
            >
              {mode === "signin" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </div>

      {forgotOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setForgotOpen(false)}>
          <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-scholarly" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-serif text-xl font-semibold">Reset your password</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter your account email — we'll send a reset link.
            </p>
            <form onSubmit={handleForgot} className="mt-4 space-y-3">
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setForgotOpen(false)} className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                  Cancel
                </button>
                <button type="submit" disabled={forgotBusy} className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                  {forgotBusy ? "Sending..." : "Send reset link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

    </div>
  );
}
