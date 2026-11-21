"use client";

import { useMemo, useState } from "react";
import { Search, UserRound } from "@/components/icons";

export type StudentOption = {
  id: number;
  name: string;
  username: string | null;
  kelasLabel: string | null;
};

export function StudentPicker({
  students,
  value,
  onChange,
}: {
  students: StudentOption[];
  value: number[];
  onChange: (ids: number[]) => void;
}) {
  const [query, setQuery] = useState("");
  const selected = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return students;

    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(needle) ||
        (student.username ?? "").toLowerCase().includes(needle) ||
        (student.kelasLabel ?? "").toLowerCase().includes(needle)
      );
    });
  }, [query, students]);

  function toggle(id: number) {
    if (selected.has(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    onChange([...value, id]);
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      {value.map((id) => (
        <input key={id} type="hidden" name="targetUserIds" value={id} />
      ))}

      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <span className="text-[11px] font-bold text-slate-600">
          {value.length} siswa dipilih
        </span>
        {value.length > 0 ? (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-[10px] font-bold text-rose-600 hover:underline"
          >
            Kosongkan
          </button>
        ) : null}
      </div>

      <label className="relative m-2 block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <span className="sr-only">Cari siswa</span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Cari nama, username, atau kelas…"
          className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-700 outline-none placeholder:text-slate-400 focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />
      </label>

      <div className="max-h-64 overflow-y-auto px-2 pb-2">
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-[11px] text-slate-400">
            Siswa tidak ditemukan.
          </p>
        ) : (
          <ul className="space-y-1">
            {filtered.map((student) => {
              const checked = selected.has(student.id);

              return (
                <li key={student.id}>
                  <label
                    className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors ${
                      checked
                        ? "bg-emerald-50 text-emerald-800"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(student.id)}
                      className="h-3.5 w-3.5 accent-emerald-600"
                    />
                    <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="min-w-0 flex-1 truncate font-semibold">
                      {student.name}
                    </span>
                    <span className="shrink-0 text-[10px] font-medium text-slate-400">
                      {student.kelasLabel ?? "tanpa kelas"}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
