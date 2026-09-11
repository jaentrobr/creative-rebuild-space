import { createFileRoute, Outlet } from "@tanstack/react-router";
import { RequireAuth } from "@/components/require-auth";
import { ADMIN_ROLES } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Entrô" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: AdminGate,
});

function AdminGate() {
  return (
    <RequireAuth roles={ADMIN_ROLES}>
      <Outlet />
    </RequireAuth>
  );
}
