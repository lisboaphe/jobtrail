/**
 * NEXT.JS SETTINGS
 *
 * There are two ways to build Jobtrail:
 *   npm run build       → the real app, with a server and a database
 *   npm run build:demo  → the online demo for GitHub Pages: plain files only,
 *                         data kept in the visitor's browser (see src/demo/)
 */
import type { NextConfig } from "next";

const isDemo = process.env.JOBTRAIL_DEMO === "1";

const shared: NextConfig = {
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const appConfig: NextConfig = {
  ...shared,
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // CV uploads can be up to 10 MB
    serverActions: { bodySizeLimit: "11mb" },
  },
};

const demoConfig: NextConfig = {
  ...shared,
  output: "export", // write plain HTML/CSS/JS files into out/
  basePath: process.env.PAGES_BASE_PATH ?? "/jobtrail", // the site lives at lisboaphe.github.io/jobtrail
  trailingSlash: true,
  images: { unoptimized: true },
  // Only *.demo.tsx files count as pages, so the server-only parts
  // (database, API route) are left out of the demo entirely.
  pageExtensions: ["demo.tsx"],
};

export default isDemo ? demoConfig : appConfig;
