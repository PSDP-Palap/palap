import { createFileRoute } from "@tanstack/react-router";
import { PlaceholderTab } from "@/components/admin/PlaceholderTab";

export const Route = createFileRoute("/_admin/management/shop")({
  component: () => <PlaceholderTab label="Shop" />
});
