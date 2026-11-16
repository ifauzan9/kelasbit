export const SUBJECTS = ["Informatika", "KKA"] as const;

export type Subject = (typeof SUBJECTS)[number];
