import { CalendarDays } from "@/components/icons";
import {
  formatJakartaDateTime,
  type MaintenanceSetting,
} from "@/lib/settings/maintenance";

type NoticeSetting = Pick<
  MaintenanceSetting,
  "scheduleState" | "start" | "until" | "envControlled"
>;

/**
 * Banner informasi jadwal maintenance (server component).
 * Hanya tampil saat jadwal belum mulai atau sedang berjalan.
 */
export function MaintenanceScheduleNotice({
  setting,
  className = "",
}: {
  setting: NoticeSetting;
  className?: string;
}) {
  if (setting.envControlled || !setting.start) return null;

  const pending = setting.scheduleState === "pending";
  const active = setting.scheduleState === "active";

  if (!pending && !active) return null;

  const startLabel = formatJakartaDateTime(setting.start);
  const untilLabel = setting.until
    ? formatJakartaDateTime(setting.until)
    : null;

  const description = pending
    ? untilLabel
      ? `Mulai ${startLabel} hingga ${untilLabel}.`
      : `Mulai ${startLabel}.`
    : untilLabel
      ? `Perkiraan selesai ${untilLabel}.`
      : "Beberapa halaman publik dibatasi sementara.";

  const tone = pending
    ? {
        box: "border-amber-200 bg-amber-50",
        icon: "bg-white/80 text-amber-600 ring-amber-100",
        title: "text-amber-800",
        text: "text-amber-700/80",
      }
    : {
        box: "border-emerald-200 bg-emerald-50",
        icon: "bg-white/80 text-emerald-600 ring-emerald-100",
        title: "text-emerald-800",
        text: "text-emerald-700/80",
      };

  return (
    <div
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] ${tone.box} ${className}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${tone.icon}`}
      >
        <CalendarDays className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p
          className={`text-[11px] font-extrabold uppercase tracking-wide ${tone.title}`}
        >
          {pending ? "Maintenance terjadwal" : "Maintenance sedang berlangsung"}
        </p>
        <p className={`mt-1 text-xs leading-relaxed ${tone.text}`}>
          {description}
        </p>
      </div>
    </div>
  );
}
