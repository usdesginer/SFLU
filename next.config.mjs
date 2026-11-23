/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: [
    '192.168.18.4',
    '192.168.*.*',
    '192.168.*',
    '127.0.0.1',
    '10.*.*.*',
    '172.16.*.*',
  ],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  experimental: {
    cpus: 1,
    workerThreads: false,
    webpackMemoryOptimizations: true,
    preloadEntriesOnStart: false,
    optimizePackageImports: ['lucide-react', 'recharts'],
  },
  webpack: (config) => {
    // Disable persistent filesystem pack-file serialization on Windows
    // to prevent `RangeError: Array buffer allocation failed` (OS VirtualAlloc commit pressure)
    config.cache = false;
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
