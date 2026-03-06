import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

import EarningTab from "@/components/freelance/EarningTab";
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_freelance/freelance/earning")({
  component: EarningRoute
});

function EarningRoute() {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const [earningSummary, setEarningSummary] = useState({
    totalIncome: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0
  });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loadingEarning, setLoadingEarning] = useState(false);

  const loadEarningSummary = async () => {
    if (!currentUserId) return;
    try {
      setLoadingEarning(true);
      const { data: earnings, error } = await supabase
        .from("freelance_earnings")
        .select("*, orders(price, status)")
        .eq("freelance_id", currentUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const list = earnings || [];
      const total = list
        .filter((e) => e.status === "completed" || e.status === "paid")
        .reduce((sum, e) => sum + Number(e.amount || 0), 0);
      
      const completedCount = list.filter((e) => e.status === "completed" || e.status === "paid").length;
      const pendingCount = list.filter((e) => e.status === "pending").length;

      setTransactions(list);
      setEarningSummary({
        totalIncome: total,
        totalOrders: list.length,
        completedOrders: completedCount,
        pendingOrders: pendingCount
      });
    } catch (err) {
      console.error("Failed to load earnings:", err);
    } finally {
      setLoadingEarning(false);
    }
  };

  useEffect(() => {
    loadEarningSummary();
  }, [currentUserId]);

  return (
    <EarningTab
      loadingEarning={loadingEarning}
      earningSummary={earningSummary}
      transactions={transactions}
    />
  );
}
