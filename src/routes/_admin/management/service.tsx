import { createFileRoute } from "@tanstack/react-router";

import ServiceTab from "@/components/admin/service-management/ServiceTab";

export const Route = createFileRoute("/_admin/management/service")({
  component: ServiceTab
});
