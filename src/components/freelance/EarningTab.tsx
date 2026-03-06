import Loading from "@/components/shared/Loading";

interface EarningTabProps {
  loadingEarning: boolean;
  earningSummary: {
    totalIncome: number;
    totalOrders: number;
    completedOrders: number;
    pendingOrders: number;
  };
  transactions: any[];
}

const EarningTab = ({ loadingEarning, earningSummary, transactions }: EarningTabProps) => {
  return (
    <div className="space-y-4 min-h-full pb-10 flex flex-col">
      <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm shrink-0">
        <h2 className="text-xl font-black text-[#4A2600] mb-3 shrink-0">
          Earning Summary
        </h2>
        {loadingEarning ? (
          <div className="py-6 flex justify-center">
            <Loading fullScreen={false} size={60} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
              <p className="text-xs text-gray-500 uppercase font-bold">Total Income</p>
              <p className="text-2xl font-black text-[#5D2611]">
                ฿ {earningSummary.totalIncome.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Completed
              </p>
              <p className="text-2xl font-black text-[#5D2611]">
                {earningSummary.completedOrders}
              </p>
            </div>
            <div className="rounded-lg bg-orange-50 border border-orange-100 p-4 text-center">
              <p className="text-xs text-gray-500 uppercase font-bold">
                Pending
              </p>
              <p className="text-2xl font-black text-[#5D2611]">
                {earningSummary.pendingOrders}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm flex-1 flex flex-col overflow-hidden">
        <h2 className="text-lg font-black text-[#4A2600] mb-3">
          Transaction History
        </h2>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {loadingEarning ? (
            <div className="py-10 flex justify-center">
              <Loading fullScreen={false} size={40} />
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-10 text-center text-gray-500 italic">
              No transactions yet.
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((e) => (
                <div 
                  key={e.id} 
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:bg-orange-50/30 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-[#4A2600] text-sm truncate">
                      Order: {String(e.order_id).slice(0, 8)}...
                    </p>
                    <p className="text-[10px] text-gray-500">
                      {new Date(e.created_at).toLocaleDateString()} {new Date(e.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                  
                  <div className="text-right">
                    <p className="font-black text-[#5D2611]">
                      ฿ {Number(e.amount).toLocaleString()}
                    </p>
                    <span 
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                        e.status === 'completed' || e.status === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}
                    >
                      {e.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EarningTab;
