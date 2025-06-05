import { createMDX } from 'fumadocs-mdx/next';

const withMDX = createMDX();

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['awesome_module'],

  eslint: {
    ignoreDuringBuilds: true, // Allow builds to succeed even if there are ESLint errors
  }
};

export default withMDX(config);
