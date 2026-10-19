// ============================================================================
// Entry point produksi untuk cPanel (Setup Node.js App / Passenger).
//
// Next.js tidak punya server.js sendiri, jadi file ini menjadi "Application
// startup file" di cPanel. Struktur folder tetap utuh: public/, .next/, dan
// node_modules/ dibaca langsung dari root proyek — tidak ada yang perlu
// disalin ulang setiap build (beda dengan output: "standalone").
//
// Pakai: npm run build  →  npm start
// ============================================================================

const { createServer } = require("node:http");
const next = require("next");

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = Number(process.env.PORT) || 3000;

const app = next({ dev, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error("Gagal menangani permintaan:", err);
      if (!res.headersSent) {
        res.statusCode = 500;
        res.end("Internal Server Error");
      }
    });
  }).listen(port, hostname, () => {
    console.log(`Portal berjalan di http://${hostname}:${port}`);
  });
});

// Passenger bisa mengirim sinyal terminasi saat redeploy.
process.on("SIGTERM", () => process.exit(0));
process.on("SIGINT", () => process.exit(0));
