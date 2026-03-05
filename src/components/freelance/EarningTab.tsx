import Loading from "@/components/shared/Loading";

interface EarningTabProps {
  loadingEarning: boolean;
  earningSummary: {
    totalIncome: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
  };
}

const EarningTab = ({ loadingEarning, earningSummary }: EarningTabProps) => {
  return (
    <div className="space-y-4 min-h-full pb-10 flex flex-col">
      <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm flex-1 flex flex-col">
        <h2 className="text-xl font-black text-[#4A2600] mb-3 shrink-0">
          Earning Summary
        </h2>
        <div
          className={`flex-1 flex flex-col ${loadingEarning ? "items-center justify-center" : ""}`}
        >
          {loadingEarning ? (
            <Loading fullScreen={false} size={60} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
                <p className="text-xs text-gray-500 uppercase">Total Income</p>
                <p className="text-2xl font-black text-[#5D2611]">
                  ฿ {earningSummary.totalIncome.toLocaleString()}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
                <p className="text-xs text-gray-500 uppercase">
                  Completed Orders
                </p>
                <p className="text-2xl font-black text-[#5D2611]">
                  {earningSummary.completedOrders}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
                <p className="text-xs text-gray-500 uppercase">
                  Pending Orders
                </p>
                <p className="text-2xl font-black text-[#5D2611]">
                  {earningSummary.pendingOrders}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EarningTab;
