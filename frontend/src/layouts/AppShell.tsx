import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { AppPillNav } from "@/components/smady/PillNav";

export function AppShell() {
  const { isAuthenticated, authLoading } = useAuth();
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-sm text-muted" data-testid="app-shell-loading">
        Loading…
      </div>
    );
  }
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <div className="relative min-h-screen bg-bg">
      <div className="blob-field" style={{ opacity: 0.25 }}>
        <div className="blob blob-orange" style={{ width: 420, height: 420, top: "-160px", right: "-120px" }} />
      </div>
      <div className="relative z-[1]">
        <AppPillNav />
        <main className="mx-auto max-w-7xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
