/** @type {import("@serwist/cli").SerwistCliOptions} */
module.exports = {
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  globDirectory: "public",
  globPatterns: ["**/*.{js,css,html,png,svg,ico,json}"],
  globIgnores: ["sw.js", "workbox-*.js"],
};
