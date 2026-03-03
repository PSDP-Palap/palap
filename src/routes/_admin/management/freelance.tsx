import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderTab } from "@/components/admin/PlaceholderTab";

export const Route = createFileRoute("/_admin/management/freelance")({
  component: () => <PlaceholderTab label="Freelance" />
});
