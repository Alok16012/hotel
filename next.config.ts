import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Pin the workspace root. Without it Turbopack walks up looking for a lock
    // file, finds one in the home directory, and warns on every build.
    root: path.resolve(process.cwd()),
  },
};

export default nextConfig;
