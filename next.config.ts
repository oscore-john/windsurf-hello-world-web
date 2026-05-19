import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  output: 'export',
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://vyjswambsfbpebkwbwcx.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5anN3YW1ic2ZicGVia3did2N4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMTU1NTMsImV4cCI6MjA5NDU5MTU1M30.9vFxHR9CTfS3DOP0PWOulww1RgDov206tUA4Ofdfqcw',
  },
};

export default nextConfig;
