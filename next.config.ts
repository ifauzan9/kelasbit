import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["pg", "exceljs"],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
