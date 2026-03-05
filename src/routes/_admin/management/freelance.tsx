import { createFileRoute } from "@tanstack/react-router";

import FreelanceTab from "@/components/admin/freelance-management/FreelanceTab";

export const Route = createFileRoute("/_admin/management/freelance")({
  component: FreelanceTab
});
