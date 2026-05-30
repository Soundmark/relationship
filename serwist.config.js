// @ts-check

/** @type {import("@serwist/build").InjectManifestOptions} */
const config = {
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  globDirectory: ".",
  globPatterns: ["**/*.{html,js,css,png,svg,ico,json}"],
  globIgnores: [
    "**/node_modules/**",
    ".next/**",
    "src/**",
    "serwist.config.js",
    "tsconfig.json",
    "tsconfig.tsbuildinfo",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "eslint.config.mjs",
    "postcss.config.mjs",
    ".gitignore",
    "README.md",
    "design.md",
    "CLAUDE.md",
    "AGENTS.md",
    ".wolf/**",
    ".claude/**",
  ],
  maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
};

module.exports = config;
