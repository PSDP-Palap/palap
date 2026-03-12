import { createFileRoute } from "@tanstack/react-router";

import PaymentTab from "@/components/admin/payment-management/PaymentTab";

export const Route = createFileRoute("/_admin/management/payment")({
	component: () => <PaymentTab />,
});
