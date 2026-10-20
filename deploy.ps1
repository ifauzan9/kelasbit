# Menyiapkan paket deploy untuk hosting cPanel.
#
# Skrip ini HANYA bekerja di laptop (tidak mengunggah apa pun). Hasilnya berupa
# next-build.zip yang tinggal di-upload lewat File Manager cPanel.
#
# Pakai:
#   .\deploy.ps1                      # build + zip saja
#   .\deploy.ps1 -Pesan "tambah fitur" # build + zip + commit + push
#
# Setelah skrip selesai, ikuti langkah di CATATAN-PRODUKSI.md bagian
# "Deploy ke cPanel".

param(
  [string]$Pesan = "",
  [switch]$LewatiCek
)

$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot

function Info($teks) { Write-Host $teks -ForegroundColor Cyan }
function Sukses($teks) { Write-Host $teks -ForegroundColor Green }
function Gagal($teks) { Write-Host $teks -ForegroundColor Red }

# PowerShell menganggap tulisan apa pun ke stderr (termasuk warning npm) sebagai
# error, padahal perintahnya bisa sukses. Jadi perintah dijalankan lewat
# cmd.exe supaya hasilnya dinilai dari exit code, bukan dari jenis stream.
function Jalankan($perintah) {
  $keluaran = & cmd /c "$perintah 2>&1" | Out-String
  return @{ Kode = $LASTEXITCODE; Keluaran = $keluaran }
}

# --- 1. Cek TypeScript & lint sebelum membuang waktu build ------------------

if (-not $LewatiCek) {
  Info "Memeriksa TypeScript..."
  $cek = Jalankan "npx tsc --noEmit"
  if ($cek.Kode -ne 0) {
    Gagal $cek.Keluaran
    throw "TypeScript masih error. Perbaiki dulu, atau jalankan ulang dengan -LewatiCek."
  }

  Info "Memeriksa ESLint..."
  $cek = Jalankan "npx eslint src"
  if ($cek.Kode -ne 0) {
    Gagal $cek.Keluaran
    throw "ESLint masih bermasalah. Perbaiki dulu, atau jalankan ulang dengan -LewatiCek."
  }
}

# --- 2. Build produksi ------------------------------------------------------
# package.json sudah memakai "next build --webpack"; Turbopack tidak tersedia
# di hosting, jadi hasil Webpack yang dipakai.

Info "Menjalankan build produksi..."
Remove-Item -Recurse -Force ".next" -ErrorAction SilentlyContinue
$hasil = Jalankan "npm run build"
if ($hasil.Kode -ne 0) {
  Gagal $hasil.Keluaran
  throw "Build gagal. Lihat pesan di atas."
}

# --- 3. Bersihkan cache agar ZIP kecil --------------------------------------
# .next/cache dan .next/trace tidak dibutuhkan Passenger saat menjalankan app.
# .next/dev (sisa `npm run dev`) juga ikut dibuang bila ada.

Info "Membersihkan cache build..."
foreach ($folder in @("cache", "trace", "trace-build", "diagnostics", "dev")) {
  Remove-Item -Recurse -Force ".next\$folder" -ErrorAction SilentlyContinue
}

$buildId = (Get-Content ".next\BUILD_ID" -Raw).Trim()
if ([string]::IsNullOrWhiteSpace($buildId)) { throw ".next\BUILD_ID kosong, build tidak valid." }

# --- 4. Bungkus jadi ZIP ----------------------------------------------------

Info "Membuat next-build.zip..."
Remove-Item -Force "next-build.zip" -ErrorAction SilentlyContinue
Compress-Archive -Path ".next" -DestinationPath "next-build.zip" -Force

$zip = Get-Item "next-build.zip"
$ukuranMb = [math]::Round($zip.Length / 1MB, 2)
if ($ukuranMb -gt 20) {
  Gagal "ZIP berukuran $ukuranMb MB, terlalu besar. Kemungkinan cache masih ikut."
  throw "Periksa isi ZIP sebelum di-upload."
}

# --- 5. Commit + push (opsional) --------------------------------------------

$pushDilakukan = $false
if (-not [string]::IsNullOrWhiteSpace($Pesan)) {
  Info "Menyimpan perubahan ke Git..."
  $commit = Jalankan "git add -A && git commit -m `"$Pesan`""
  if ($commit.Kode -ne 0) {
    Gagal $commit.Keluaran
    Gagal "Commit gagal (mungkin tidak ada perubahan)."
  } else {
    $push = Jalankan "git push"
    if ($push.Kode -ne 0) {
      Gagal $push.Keluaran
      Gagal "Push gagal. Periksa koneksi / kredensial Git."
    } else {
      $pushDilakukan = $true
    }
  }
}

# --- 6. Ringkasan -----------------------------------------------------------

Write-Host ""
Sukses "=== Paket deploy siap ==="
Write-Host "  BUILD_ID : $buildId"
Write-Host "  ZIP      : $($zip.FullName) ($ukuranMb MB)"
Write-Host "  Git push : $(if ($pushDilakukan) { 'ya' } else { 'tidak (pakai -Pesan untuk push)' })"
Write-Host ""
Write-Host "Langkah berikutnya (lihat CATATAN-PRODUKSI.md):" -ForegroundColor Yellow
Write-Host "  1. cPanel - File Manager - folder kelasbit - Upload next-build.zip"
Write-Host "  2. Extract di folder tersebut (menimpa .next lama)"
Write-Host "  3. Terminal cPanel:"
Write-Host "       cd ~/kelasbit && git pull"
Write-Host "       chmod -R u+rwX .next"
Write-Host "       find .next -type d ! -perm -u+r -exec chmod 755 {} \;"
Write-Host "       find .next -type f ! -perm -u+r -exec chmod 644 {} \;"
Write-Host "       cat .next/BUILD_ID     # harus sama dengan $buildId"
Write-Host "       rm -f next-build.zip"
Write-Host "  4. cPanel - Setup Node.js App - Restart"
