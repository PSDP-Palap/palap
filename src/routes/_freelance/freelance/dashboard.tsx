import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";

import DashboardTabContent from "@/components/freelance/DashboardTab";
import { useUserStore } from "@/stores/useUserStore";
import type { Service } from "@/types/service";
import supabase from "@/utils/supabase";

export const Route = createFileRoute("/_freelance/freelance/dashboard")({
  component: DashboardRoute
});

function DashboardRoute() {
  const { profile, session } = useUserStore();
  const currentUserId = profile?.id || session?.user?.id || null;
  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [earningSummary, setEarningSummary] = useState({
    totalIncome: 0,
    totalOrders: 0,
    completedOrders: 0,
    pendingOrders: 0
  });

  const loadDashboardData = useCallback(async () => {
    if (!currentUserId) return;
    setLoadingServices(true);
    try {
      const { data: svcData } = await supabase
        .from("services")
        .select("*")
        .eq("created_by", currentUserId)
        .limit(5);

      setServices((svcData as Service[]) || []);

      const { data: earnings } = await supabase
        .from("freelance_earnings")
        .select("*")
        .eq("freelance_id", currentUserId);

      const total = (earnings || []).reduce(
        (sum, e) => sum + Number(e.amount || 0),
        0
      );

      setEarningSummary({
        totalIncome: total,
        totalOrders: (earnings || []).length,
        completedOrders: (earnings || []).length,
        pendingOrders: 0
      });
    } finally {
      setLoadingServices(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <DashboardTabContent
      currentEarning={earningSummary.totalIncome}
      upcomingJobs={services}
      loadingServices={loadingServices}
    />
  );
}
