import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import DashboardTabContent from "@/components/freelance/DashboardTab";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_freelance/freelance/dashboard")({
	component: DashboardRoute,
});

function DashboardRoute() {
	const { profile, session } = useUserStore();
	const currentUserId = profile?.id || session?.user?.id || null;
	const [orders, setOrders] = useState<any[]>([]);
	const [loadingOrders, setLoadingOrders] = useState(false);
	const [earningSummary, setEarningSummary] = useState({
		totalIncome: 0,
		totalOrders: 0,
		completedOrders: 0,
		pendingOrders: 0,
	});

	const loadDashboardData = useCallback(async () => {
		if (!currentUserId) return;
		setLoadingOrders(true);
		try {
			const { data: ordData } = await supabase
				.from("orders")
				.select(`
          *,
          service:services(name, category),
          product:products(name),
          earning:freelance_earnings(amount, status)
        `)
				.eq("freelance_id", currentUserId)
				.order("created_at", { ascending: false })
				.limit(10);

			setOrders(ordData || []);

			const { data: earnings } = await supabase
				.from("freelance_earnings")
				.select("*")
				.eq("freelance_id", currentUserId);

			const total = (earnings || [])
				.filter((e) => {
					const s = String(e.status || "").toLowerCase();
					return s === "completed" || s === "paid";
				})
				.reduce((sum, e) => sum + Number(e.amount || 0), 0);


			const completedCount = (earnings || []).filter((e) => {
				const s = String(e.status || "").toLowerCase();
				return s === "completed" || s === "paid";
			}).length;

			const pendingCount = (earnings || []).filter((e) => {
				const s = String(e.status || "").toLowerCase();
				return s === "pending";
			}).length;

			setEarningSummary({
				totalIncome: total,
				totalOrders: (earnings || []).length,
				completedOrders: completedCount,
				pendingOrders: pendingCount,
			});
		} finally {
			setLoadingOrders(false);
		}
	}, [currentUserId]);

	useEffect(() => {
		loadDashboardData();
	}, [loadDashboardData]);

	return (
		<DashboardTabContent
			currentEarning={earningSummary.totalIncome}
			orders={orders}
			loadingOrders={loadingOrders}
		/>
	);
}
