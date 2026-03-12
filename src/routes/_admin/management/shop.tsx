import { createFileRoute } from "@tanstack/react-router";

import ShopTab from "@/components/admin/shop-management/ShopTab";

export const Route = createFileRoute("/_admin/management/shop")({
	component: ShopTab,
});
