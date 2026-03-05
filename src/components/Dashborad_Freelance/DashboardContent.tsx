import { useEffect, useState } from "react";
import { StatCards } from "./StatCards";
// import { JobItem } from "./JobItem"; // Removed unused import
import { useUserStore } from "@/stores/useUserStore";
import supabase from "@/utils/supabase";

interface IncomeHistoryItem {
  id: string;
  serviceName: string;
  price: number;
  releasedAt: string;
}

interface OngoingJobItem {
  id: string;
  serviceName: string;
  price: number;
  customerName: string;
  acceptedAt: string;
}

export const DashboardContent = () => {
  const { profile, fetchProfile } = useUserStore();
  const [earning, setEarning] = useState<number>(0);
  const [loadingEarning, setLoadingEarning] = useState(true);
  const [incomeHistory, setIncomeHistory] = useState<IncomeHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [ongoingJobs, setOngoingJobs] = useState<OngoingJobItem[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);

  // Fetch current earning in background
  useEffect(() => {
    let ignore = false;
    const fetchEarning = async () => {
      setLoadingEarning(true);
      const latestProfile = await fetchProfile();
      if (!ignore && latestProfile && typeof latestProfile.earning === "number") {
        setEarning(latestProfile.earning);
      } else if (!ignore) {
        setEarning(0);
      }
      setLoadingEarning(false);
    };
    fetchEarning();
    return () => { ignore = true; };
  }, [fetchProfile]);

  // Fetch income history (completed jobs/payments released)
  useEffect(() => {
    let ignore = false;
    const fetchHistory = async () => {
      setLoadingHistory(true);
      if (!profile?.id) {
        setIncomeHistory([]);
        setLoadingHistory(false);
        return;
      }
      // Find all chat_messages with SYSTEM_WORK_RELEASED_PREFIX for this freelancer
      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, message, created_at, order_id")
        .ilike("message", "%[SYSTEM_WORK_RELEASED]%")
        .order("created_at", { ascending: false });
      if (error || !data) {
        setIncomeHistory([]);
        setLoadingHistory(false);
        return;
      }
      // Filter for this freelancer and deduplicate by order_id
      const uniqueByOrder: Record<string, IncomeHistoryItem> = {};
      for (const msg of data) {
        if (!msg.message.includes(`FREELANCER:${profile.id}`)) continue;
        const priceMatch = msg.message.match(/PRICE:([\d.]+)/);
        const price = priceMatch ? Number(priceMatch[1]) : 0;
        let serviceName = "Service";
        if (msg.order_id) {
          const { data: orderRow } = await supabase
            .from("services")
            .select("name")
            .eq("service_id", msg.order_id)
            .maybeSingle();
          if (orderRow?.name) serviceName = orderRow.name;
        }
        if (!uniqueByOrder[msg.order_id]) {
          uniqueByOrder[msg.order_id] = {
            id: msg.id,
            serviceName,
            price,
            releasedAt: msg.created_at,
          };
        }
      }
      if (!ignore) setIncomeHistory(Object.values(uniqueByOrder));
      setLoadingHistory(false);
    };
    fetchHistory();
    return () => { ignore = true; };
  }, [profile?.id]);

  // Fetch ongoing jobs (not completed)
  useEffect(() => {
    let ignore = false;
    const fetchOngoingJobs = async () => {
      setLoadingJobs(true);
      if (!profile?.id) {
        setOngoingJobs([]);
        setLoadingJobs(false);
        return;
      }
      // Find all chat_rooms for this freelancer
      const { data: rooms, error: roomError } = await supabase
        .from("chat_rooms")
        .select("id, order_id, customer_id, freelancer_id")
        .eq("freelancer_id", profile.id);
      if (roomError || !rooms) {
        setOngoingJobs([]);
        setLoadingJobs(false);
        return;
      }
      // For each room, check if it has a SYSTEM_WORK_RELEASED message (completed)
      const jobs: OngoingJobItem[] = [];
      for (const room of rooms) {
        // Check for released message
        const { data: releasedMsgs } = await supabase
          .from("chat_messages")
          .select("id")
          .eq("room_id", room.id)
          .ilike("message", "%[SYSTEM_WORK_RELEASED]%");
        if (releasedMsgs && releasedMsgs.length > 0) continue; // skip completed
        // Get service name and price
        let serviceName = "Service";
        let price = 0;
        if (room.order_id) {
          const { data: serviceRow } = await supabase
            .from("services")
            .select("name, price")
            .eq("service_id", room.order_id)
            .maybeSingle();
          if (serviceRow?.name) serviceName = serviceRow.name;
          if (serviceRow?.price) price = serviceRow.price;
        }
        // Get customer name
        let customerName = "Customer";
        if (room.customer_id) {
          const { data: customerRow } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("id", room.customer_id)
            .maybeSingle();
          if (customerRow?.full_name) customerName = customerRow.full_name;
        }
        // Find acceptedAt (first SYSTEM_HIRE_ACCEPTED message)
        const { data: acceptedMsgs } = await supabase
          .from("chat_messages")
          .select("created_at")
          .eq("room_id", room.id)
          .ilike("message", "%[SYSTEM_HIRE_ACCEPTED]%")
          .order("created_at", { ascending: true })
          .limit(1);
        const acceptedAt = acceptedMsgs && acceptedMsgs.length > 0 ? acceptedMsgs[0].created_at : "";
        jobs.push({
          id: room.id,
          serviceName,
          price,
          customerName,
          acceptedAt,
        });
      }
      if (!ignore) setOngoingJobs(jobs);
      setLoadingJobs(false);
    };
    fetchOngoingJobs();
    return () => { ignore = true; };
  }, [profile?.id]);

  return (
    <div className="flex flex-col gap-8">
      {/* Header Section */}
      <section>
        <h2 className="text-4xl font-bold mb-6">Dashboard</h2>
        <div className="flex gap-6">
          <StatCards label="Current Earning" value={loadingEarning ? "..." : `฿ ${earning.toLocaleString()}`} />
        </div>
      </section>

      {/* Ongoing Jobs Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Ongoing Service Jobs</h2>
        {loadingJobs ? (
          <div className="text-orange-700">Loading ongoing jobs...</div>
        ) : ongoingJobs.length === 0 ? (
          <div className="text-gray-500">No ongoing jobs.</div>
        ) : (
          <div className="space-y-2">
            {ongoingJobs.map((job) => (
              <div key={job.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="font-bold text-lg">{job.serviceName}</div>
                  <div className="text-xs text-gray-400">Customer: {job.customerName}</div>
                  <div className="text-xs text-gray-400">Accepted: {job.acceptedAt ? new Date(job.acceptedAt).toLocaleString() : "-"}</div>
                </div>
                <div className="font-bold text-orange-700 text-xl">฿ {job.price.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Income History Section */}
      <section>
        <h2 className="text-2xl font-bold mb-4">Income History</h2>
        {loadingHistory ? (
          <div className="text-orange-700">Loading income history...</div>
        ) : incomeHistory.length === 0 ? (
          <div className="text-gray-500">No income history yet.</div>
        ) : (
          <div className="space-y-2">
            {incomeHistory.map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-4 flex items-center justify-between shadow-sm">
                <div>
                  <div className="font-bold text-lg">{item.serviceName}</div>
                  <div className="text-xs text-gray-400">{new Date(item.releasedAt).toLocaleString()}</div>
                </div>
                <div className="font-bold text-green-700 text-xl">+฿ {item.price.toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};