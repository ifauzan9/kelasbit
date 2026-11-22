"use client";

import { useEffect } from "react";

/**
 * Draft lama memakai key global `kelasbit:tugas:<id>:draft` dan
 * `kelasbit:lab:draft`, sehingga bisa terbaca siswa lain di perangkat sama.
 * Key baru sudah menyertakan user id; komponen ini membersihkan key lama.
 */
export function DraftStorageCleanup() {
  useEffect(() => {
    try {
      const remove: string[] = [];
      for (let index = 0; index < window.localStorage.length; index += 1) {
        const key = window.localStorage.key(index);
        if (!key) continue;
        if (
          key === "kelasbit:lab:draft" ||
          /^kelasbit:tugas:\d+:draft$/.test(key)
        ) {
          remove.push(key);
        }
      }
      remove.forEach((key) => window.localStorage.removeItem(key));
    } catch {
      // localStorage bisa diblokir; abaikan.
    }
  }, []);

  return null;
}
