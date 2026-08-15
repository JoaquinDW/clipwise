import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Next 14 spells this `experimental.serverComponentsExternalPackages`.
    // The Next 15 name (`serverExternalPackages`) is silently ignored here,
    // which bundles bullmq/ioredis into every function that enqueues a job.
    serverComponentsExternalPackages: ['bullmq', 'ioredis'],
  },
};

export default withNextIntl(nextConfig);
