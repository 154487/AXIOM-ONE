import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Manter pacotes server-only fora do bundle do cliente
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "prisma",
    "pg",
    "bcryptjs",
  ],
  webpack: (config) => {
    // Ignorar pg-native (módulo opcional que não está instalado)
    config.resolve.alias = {
      ...config.resolve.alias,
      "pg-native": false,
    };
    return config;
  },
};

export default nextConfig;
