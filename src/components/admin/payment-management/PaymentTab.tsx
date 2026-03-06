import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import Loading from "@/components/shared/Loading";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";
import supabase from "@/utils/supabase";

interface EarningDetail {
  id: string;
  order_id: string;
  freelance_id: string;
  amount: number;
  status: "pending" | "paid" | string;
  paid_at: string | null;
  created_at: string;
  freelance_name: string;
  freelance_email: string;
}

const PaymentTab = () => {
  const [earnings, setEarnings] = useState<EarningDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const fetchEarnings = async () => {
    setIsLoading(true);
    try {
      // Query freelance_earnings joined with freelances -> profiles
      const { data, error } = await supabase
        .from("freelance_earnings")
        .select(`
          id,
          order_id,
          freelance_id,
          amount,
          status,
          paid_at,
          created_at,
          freelances (
            id,
            profiles (
              full_name,
              email
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transformed = (data || []).map((item: any) => {
        const freelance = Array.isArray(item.freelances)
          ? item.freelances[0]
          : item.freelances;
        const profile = freelance?.profiles;

        return {
          id: item.id,
          order_id: item.order_id,
          freelance_id: item.freelance_id,
          amount: Number(item.amount) || 0,
          status: item.status,
          paid_at: item.paid_at,
          created_at: item.created_at,
          freelance_name: profile?.full_name || "Unknown",
          freelance_email: profile?.email || "Unknown"
        };
      });

      setEarnings(transformed);
    } catch (error) {
      console.error("Error fetching earnings:", error);
      toast.error("Failed to load payment data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptPayment = async (earningId: string) => {
    if (!window.confirm("ยืนยันการจ่ายเงินให้กับ Freelance ใช่หรือไม่?")) return;

    setIsUpdating(earningId);
    const loadingToast = toast.loading("กำลังดำเนินการ...");
    try {
      const { error } = await supabase
        .from("freelance_earnings")
        .update({
          status: "paid",
          paid_at: new Date().toISOString()
        })
        .eq("id", earningId);

      if (error) throw error;

      toast.success("จ่ายเงินเรียบร้อยแล้ว", { id: loadingToast });
      fetchEarnings(); // Refresh data
    } catch (error) {
      console.error("Error updating payment status:", error);
      toast.error("ไม่สามารถดำเนินการได้ โปรดตรวจสอบการตั้งค่า Database", {
        id: loadingToast
      });
    } finally {
      setIsUpdating(null);
    }
  };

  useEffect(() => {
    fetchEarnings();
  }, []);

  const filteredEarnings = earnings.filter(
    (e) =>
      e.freelance_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.freelance_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.order_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
      default:
        return "bg-amber-100 text-amber-700 border-amber-200";
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex items-center justify-center h-full min-h-100">
        <Loading fullScreen={false} size={150} />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden relative flex flex-col h-full">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800">Payments</h2>
            <button
              onClick={() => fetchEarnings()}
              disabled={isLoading}
              className="p-2 text-gray-500 hover:text-[#A6411C] hover:bg-orange-50 rounded-xl transition-all disabled:opacity-50"
              title="รีเฟรชข้อมูล"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-5 w-5 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
          <div className="relative w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <input
              type="text"
              placeholder="ค้นหาชื่อ, Order ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#A6411C] focus:bg-white transition-all"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="px-6 py-4 font-semibold">Order ID</th>
                <th className="px-6 py-4 font-semibold">Freelancer</th>
                <th className="px-6 py-4 font-semibold">Amount</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold text-center">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEarnings.length > 0 ? (
                filteredEarnings.map((earning) => (
                  <tr
                    key={earning.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm font-mono text-gray-500">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span
                            className="cursor-pointer hover:text-[#A6411C] transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(earning.order_id);
                              toast.success("คัดลอก Order ID เรียบร้อยแล้ว");
                            }}
                          >
                            {earning.order_id.split("-")[0]}...
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>{earning.order_id}</p>
                        </TooltipContent>
                      </Tooltip>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-800">
                          {earning.freelance_name}
                        </span>
                        <span className="text-xs text-gray-500">
                          {earning.freelance_email}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-[#A6411C]">
                      ฿{earning.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(earning.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(
                          earning.status
                        )}`}
                      >
                        {earning.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {earning.status === "pending" ? (
                        <button
                          onClick={() => handleAcceptPayment(earning.id)}
                          disabled={isUpdating === earning.id}
                          className="px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                        >
                          {isUpdating === earning.id ? "Processing..." : "Accept"}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 italic">
                          Paid on {new Date(earning.paid_at!).toLocaleDateString()}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-gray-500"
                  >
                    {searchTerm
                      ? "ไม่พบข้อมูลที่ตรงกับการค้นหา"
                      : "ไม่พบข้อมูลรายการจ่ายเงิน"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default PaymentTab;
