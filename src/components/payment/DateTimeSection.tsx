import { Calendar, Clock } from "lucide-react";

interface DateTimeSectionProps {
  appointmentDate: string;
  setAppointmentDate: (date: string) => void;
  appointmentTime: string;
  setAppointmentTime: (time: string) => void;
}

export function DateTimeSection({
  appointmentDate,
  setAppointmentDate,
  appointmentTime,
  setAppointmentTime
}: DateTimeSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-orange-600" />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Appointment Date
          </h3>
        </div>
        <div className="relative group">
          <input
            type="date"
            value={appointmentDate}
            onChange={(e) => setAppointmentDate(e.target.value)}
            className="w-full bg-orange-50/30 border border-orange-100 rounded-2xl p-4 text-sm font-bold text-[#4A2600] outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 transition-all cursor-pointer"
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-orange-600" />
          <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">
            Appointment Time
          </h3>
        </div>
        <div className="relative group">
          <input
            type="time"
            value={appointmentTime}
            onChange={(e) => setAppointmentTime(e.target.value)}
            className="w-full bg-orange-50/30 border border-orange-100 rounded-2xl p-4 text-sm font-bold text-[#4A2600] outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-300 transition-all cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
