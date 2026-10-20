import type { NextConfig } from "next";
const config: NextConfig = {
  output: process.env.RUPTURA_STANDALONE === "1" ? "standalone" : undefined,
  serverExternalPackages: ["node:sqlite"],
  poweredByHeader: false,
  allowedDevOrigins: ["127.0.0.1"],
};
export default config;
