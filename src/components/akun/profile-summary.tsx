import type { ComponentType, SVGProps } from "react";
import {
  CalendarDays,
  GraduationCap,
  Mail,
  ShieldCheck,
  UserRound,
} from "@/components/icons";
import type { ProfileData } from "@/lib/akun/queries";

type IconComponent = ComponentType<SVGProps<SVGSVGElement>>;

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function initialsOf(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function InfoRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: IconComponent;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/60 px-3.5 py-3">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-400 ring-1 ring-slate-200">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <dt className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-slate-400">
          {label}
        </dt>
        <dd
          className={`mt-0.5 break-words text-sm font-bold text-slate-800 ${mono ? "font-mono" : ""}`}
        >
          {value}
        </dd>
      </div>
    </div>
  );
}

export function ProfileSummary({ profile }: { profile: ProfileData }) {
  const isGuru = profile.role === "guru";
  const kelasLabel = profile.kelasName
    ? `${profile.kelasName} · ${profile.academicYear}`
    : "Tanpa kelas";

  return (
    <section className="h-fit rounded-3xl border border-slate-200/80 bg-white p-5 shadow-[0_1px_2px_rgba(16,12,40,0.04)] sm:p-6">
      <div className="flex items-center gap-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-xl font-extrabold text-emerald-700 ring-1 ring-emerald-200">
          {initialsOf(profile.name)}
        </span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-extrabold tracking-tight text-slate-900">
            {profile.name}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-100">
              <ShieldCheck className="h-3 w-3" />
              {isGuru ? "Guru" : "Siswa"}
            </span>
            <span
              className={
                profile.isActive
                  ? "inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold text-slate-500 ring-1 ring-slate-200"
                  : "inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-600 ring-1 ring-rose-100"
              }
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${profile.isActive ? "bg-emerald-500" : "bg-rose-500"}`}
              />
              {profile.isActive ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </div>
      </div>

      <dl className="mt-6 space-y-2.5">
        {!isGuru ? (
          <InfoRow
            icon={UserRound}
            label="Username"
            value={profile.username ?? "—"}
            mono
          />
        ) : null}
        <InfoRow
          icon={Mail}
          label="Email"
          value={profile.email ?? "Belum diisi"}
        />
        {!isGuru ? (
          <InfoRow icon={GraduationCap} label="Kelas" value={kelasLabel} />
        ) : null}
        <InfoRow
          icon={CalendarDays}
          label="Bergabung"
          value={dateFormatter.format(profile.createdAt)}
        />
      </dl>

      {isGuru ? (
        <p className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50/60 px-3.5 py-3 text-xs font-medium leading-relaxed text-emerald-800">
          Akun ini mengelola seluruh konten KelasBit. Email dipakai untuk login,
          jadi pastikan selalu aktif dan mudah diingat.
        </p>
      ) : null}
    </section>
  );
}
