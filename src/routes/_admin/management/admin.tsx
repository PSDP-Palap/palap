import { createFileRoute } from "@tanstack/react-router";

import AdminTab from "@/components/admin/admin-management/AdminTab";

export const Route = createFileRoute("/_admin/management/admin")({
  component: AdminTab
});
