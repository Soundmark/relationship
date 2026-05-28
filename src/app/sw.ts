import {
  CacheFirst,
  CacheableResponsePlugin,
  ExpirationPlugin,
  NavigationRoute,
  NetworkFirst,
  PrecacheFallbackPlugin,
  Serwist,
} from "serwist";

declare const self: ServiceWorkerGlobalScope & {
  __SW_MANIFEST: string[] | undefined;
};

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: /^https:\/\/fonts\.g(?:oogle|static)\.com\/.*/i,
      handler: new CacheFirst({
        cacheName: "google-fonts-cache",
        plugins: [
          new ExpirationPlugin({
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 30,
          }),
          new CacheableResponsePlugin({
            statuses: [0, 200],
          }),
        ],
      }),
    },
  ],
});

serwist.registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: "navigation-cache",
      plugins: [
        new PrecacheFallbackPlugin({
          fallbackUrls: ["/offline.html"],
          serwist,
        }),
      ],
    }),
  ),
);

serwist.addEventListeners();
