import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Keep local/Vercel builds predictable on machines with limited memory.
    cpus: 1,
    memoryBasedWorkersCount: false,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 100,
  },
};

export default nextConfig;
