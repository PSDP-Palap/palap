import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_freelance/freelance/")({
	beforeLoad: () => {
		throw redirect({ to: "/freelance/dashboard" });
	},
});
