import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Calculator, Menu, X, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";

function useIsActive(path: string) {
  const p = useRouterState({ select: (s) => s.location.pathname });
  return p === path || (path !== "/" && p.startsWith(path));
}

function NavLink({ to, children }: { to: string; children: React.ReactNode }) {
  const active = useIsActive(to);
  return (
    <Link
      to={to}
      className={active ? "text-blue-800 font-semibold" : "text-gray-600 hover:text-blue-600"}
    >
      {children}
    </Link>
  );
}

function MobileLink({
  to,
  onClose,
  children,
}: { to: string; onClose: () => void; children: React.ReactNode }) {
  const active = useIsActive(to);
  return (
    <Link
      to={to}
      onClick={onClose}
      aria-current={active ? "page" : undefined}
      className={
        active
          ? "inline-flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-1.5 font-bold text-blue-800"
          : "inline-flex items-center gap-2 px-4 py-1.5 text-gray-600"
      }
    >
      {children}
    </Link>
  );
}


export function SiteNav() {
  const { user, displayName, isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const qc = useQueryClient();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  }

  return (
    <>
      <nav className="bg-white shadow-lg fixed top-0 w-full z-10">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center py-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-800 flex items-center">
                <Calculator className="mr-2 h-5 w-5" />
                UOS Calculator
              </span>
            </Link>
            <div className="hidden md:flex space-x-8 items-center">
              <NavLink to="/">Home</NavLink>
              <NavLink to="/gpa">GPA</NavLink>
              <NavLink to="/cgpa">CGPA</NavLink>
              {user ? <NavLink to="/dashboard">Dashboard</NavLink> : null}
              <NavLink to="/manual">Manual</NavLink>
              {user ? <NavLink to="/profile">Profile</NavLink> : null}
              {isAdmin ? <NavLink to="/admin">Admin</NavLink> : null}
              {user ? (
                <>
                  <span className="text-sm text-gray-500">
                    Hi, <span className="font-medium text-gray-800">{displayName}</span>
                  </span>
                  <button
                    onClick={signOut}
                    className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-blue-600"
                  >
                    <LogOut className="h-3.5 w-3.5" /> Sign out
                  </button>
                </>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex items-center rounded-lg bg-blue-600 hover:bg-blue-700 px-4 py-1.5 text-sm font-semibold text-white shadow-md transition"
                >
                  Sign in
                </Link>
              )}
            </div>
            <button
              className="md:hidden text-blue-800"
              onClick={() => setOpen((o) => !o)}
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
            >
              {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* Backdrop */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-20 bg-black/40 transition-opacity duration-300 md:hidden ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Slide-in drawer */}
      <div
        className={`fixed top-0 right-0 z-30 h-full w-72 max-w-[80vw] bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <span className="font-bold text-blue-800 flex items-center">
            <Calculator className="mr-2 h-5 w-5" /> Menu
          </span>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="text-gray-500 hover:text-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col gap-1 p-4">
          <MobileLink to="/" onClose={() => setOpen(false)}>Home</MobileLink>
          <MobileLink to="/gpa" onClose={() => setOpen(false)}>GPA</MobileLink>
          <MobileLink to="/cgpa" onClose={() => setOpen(false)}>CGPA</MobileLink>
          {user ? (
            <MobileLink to="/dashboard" onClose={() => setOpen(false)}>Dashboard</MobileLink>
          ) : null}
          <MobileLink to="/manual" onClose={() => setOpen(false)}>Manual</MobileLink>
          {user ? (
            <MobileLink to="/profile" onClose={() => setOpen(false)}>Profile</MobileLink>
          ) : null}
          {isAdmin ? (
            <MobileLink to="/admin" onClose={() => setOpen(false)}>Admin</MobileLink>
          ) : null}
        </div>

        <div className="px-4 pt-2 border-t border-gray-200">
          {user ? (
            <div className="mb-3 px-4 py-2 text-sm text-gray-500">
              Hi, <span className="font-medium text-gray-800">{displayName}</span>
            </div>
          ) : null}
          {user ? (
            <button
              onClick={() => { setOpen(false); void signOut(); }}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-gray-800"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          ) : (
            <Link to="/auth" onClick={() => setOpen(false)} className="inline-block w-full rounded-lg bg-blue-600 px-6 py-2 text-center font-medium text-white">
              Sign in / Sign up
            </Link>
          )}
        </div>
      </div>
    </>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-3 text-sm text-gray-600">
          <div>
            <h3 className="text-lg font-bold text-blue-800 mb-2">UOS Calculator</h3>
            <p>GPA &amp; CGPA calculator for University of Swabi students, with saved history and PDF reports.</p>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Quick links</h4>
            <ul className="space-y-1">
              <li><Link to="/" className="hover:text-blue-600">Home</Link></li>
              <li><Link to="/gpa" className="hover:text-blue-600">GPA Calculator</Link></li>
              <li><Link to="/cgpa" className="hover:text-blue-600">CGPA Calculator</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">University</h4>
            <ul className="space-y-1">
              <li><a href="https://uoswabi.edu.pk/" target="_blank" rel="noreferrer" className="hover:text-blue-600">Official website</a></li>
              <li><a href="https://admission-uos.tallymarkscloud.com/application/index.php" target="_blank" rel="noreferrer" className="hover:text-blue-600">Admissions</a></li>
            </ul>
          </div>
        </div>
        <p className="mt-6 pt-6 border-t border-gray-200 text-center text-xs text-gray-500">
          © {new Date().getFullYear()} UOS Calculator · Built for University of Swabi students.
        </p>
      </div>
    </footer>
  );
}
