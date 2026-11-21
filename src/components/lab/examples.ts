export type LabExample = {
  id: string;
  label: string;
  code: string;
};

export const LAB_EXAMPLES: LabExample[] = [
  {
    id: "halo",
    label: "Halo Dunia",
    code: `# Contoh 1: Halo Dunia
nama = input("Siapa namamu? ")
print(f"Halo, {nama}! Selamat belajar Python.")
`,
  },
  {
    id: "variabel",
    label: "Variabel & Tipe Data",
    code: `# Contoh 2: Variabel dan tipe data
nama = "Siswa Hebat"
umur = 15
tinggi = 162.5
sudah_belajar = True

print("Nama :", nama)
print("Umur :", umur, "tahun")
print("Tinggi:", tinggi, "cm")
print("Belajar Python?", sudah_belajar)
print("Tipe umur:", type(umur).__name__)
`,
  },
  {
    id: "perulangan",
    label: "Perulangan",
    code: `# Contoh 3: Perulangan dan list
buah = ["apel", "jeruk", "mangga"]

for index, nama in enumerate(buah, start=1):
    print(f"{index}. {nama}")

print()
for angka in range(1, 6):
    print(angka, "kuadrat =", angka ** 2)
`,
  },
  {
    id: "fungsi",
    label: "Fungsi",
    code: `# Contoh 4: Fungsi
def luas_persegi_panjang(panjang, lebar):
    return panjang * lebar

def rata_rata(angka):
    return sum(angka) / len(angka)

print("Luas:", luas_persegi_panjang(8, 5))
print("Rata-rata:", rata_rata([80, 90, 75, 85]))
`,
  },
  {
    id: "kondisi",
    label: "Kondisi & Input",
    code: `# Contoh 5: Kondisi dengan input
nilai = int(input("Masukkan nilai (0-100): "))

if nilai >= 90:
    predikat = "Sangat Baik"
elif nilai >= 75:
    predikat = "Baik"
elif nilai >= 60:
    predikat = "Cukup"
else:
    predikat = "Perlu Belajar Lagi"

print(f"Nilai {nilai} -> {predikat}")
`,
  },
];

export const DEFAULT_LAB_CODE = LAB_EXAMPLES[0].code;

export function findLabExample(id: string): LabExample | undefined {
  return LAB_EXAMPLES.find((example) => example.id === id);
}
