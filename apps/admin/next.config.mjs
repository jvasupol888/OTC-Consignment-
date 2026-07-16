/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // ให้ Next transpile workspace package ที่เป็น TS
  transpilePackages: ['@otc/shared'],
};

export default nextConfig;
