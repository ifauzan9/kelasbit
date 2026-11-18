export type MateriView = {
  id: number;
  title: string;
  description: string;
  subject: string;
  createdAtLabel: string;
};

export type KelasView = {
  id: number;
  name: string;
  academicYear: string;
  studentCount: number;
};

export type KelasOption = {
  id: number;
  name: string;
  academicYear: string;
};

export type SiswaView = {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  isActive: boolean;
  kelasId: number | null;
  kelasName: string | null;
  academicYear: string | null;
};
