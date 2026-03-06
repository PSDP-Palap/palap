import Loading from "@/components/shared/Loading";
import type { Service } from "@/types/service";

interface DashboardTabProps {
  currentEarning: number;
  upcomingJobs: Service[];
  loadingServices: boolean;
}

const DashboardTab = ({
  currentEarning,
  upcomingJobs,
  loadingServices
}: DashboardTabProps) => {
  return (
    <div className="min-h-full flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0">
        <div className="bg-white rounded-xl p-6 shadow-sm text-center overflow-hidden min-w-0">
          <h3 className="text-3xl font-bold mb-1 text-[#5D2611]">
            ฿ {currentEarning.toLocaleString()}
          </h3>
          <p className="text-gray-500 font-medium">Current Earning</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm text-center overflow-hidden min-w-0">
          <h3 className="text-3xl font-bold mb-1 text-[#5D2611]">
            {upcomingJobs.length}
          </h3>
          <p className="text-gray-500 font-medium">My Jobs</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-orange-100 p-4 shadow-sm min-w-0 overflow-hidden flex-1 flex flex-col">
        <h2 className="text-xl font-black text-[#4A2600] mb-3">Recent Jobs</h2>

        <div
          className={`flex-1 min-h-0 flex flex-col ${loadingServices || upcomingJobs.length === 0 ? "items-center justify-center" : ""}`}
        >
          {loadingServices ? (
            <Loading fullScreen={false} size={60} />
          ) : upcomingJobs.length === 0 ? (
            <p className="text-sm text-gray-500">
              No jobs found for this freelance account.
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingJobs.slice(0, 5).map((item, index) => (
                <div
                  key={String(item?.service_id ?? item?.id ?? index)}
                  className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between border border-gray-100 min-w-0 overflow-hidden"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center text-2xl">
                      🐶
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-lg text-gray-800 truncate">
                        {item?.name || "Service"}
                      </h4>
                      <p className="text-xs text-gray-400 truncate">
                        {item?.pickup_address_id || "No pickup"} →{" "}
                        {item?.destination_address_id || "No destination"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="flex items-center justify-end gap-2 mb-1">
                      <span className="text-[10px] text-gray-500">
                        Category:
                      </span>
                      <span className="bg-[#FFD700] text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {item?.category || "GENERAL"}
                      </span>
                    </div>
                    <p className="text-xl font-bold text-[#5D2611]">
                      ฿ {Number(item?.price ?? 0).toFixed(2)}
                    </p>
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

export default DashboardTab;
