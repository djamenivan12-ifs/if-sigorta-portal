import type { NextConfig } from "next";

const isDevelopment =
  process.env.NODE_ENV ===
  "development";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  "";

let supabaseOrigin = "";

try {
  supabaseOrigin =
    supabaseUrl
      ? new URL(
          supabaseUrl,
        ).origin
      : "";
} catch {
  supabaseOrigin =
    "";
}

const connectSources = [
  "'self'",
  supabaseOrigin,
].filter(
  Boolean,
);

const scriptSources = [
  "'self'",
  "'unsafe-inline'",
  isDevelopment
    ? "'unsafe-eval'"
    : "",
].filter(
  Boolean,
);

const securityHeaders = [
  {
    key:
      "X-Content-Type-Options",

    value:
      "nosniff",
  },

  {
    key:
      "X-Frame-Options",

    value:
      "DENY",
  },

  {
    key:
      "Referrer-Policy",

    value:
      "strict-origin-when-cross-origin",
  },

  {
    key:
      "Permissions-Policy",

    value:
      "camera=(), microphone=(), geolocation=(), payment=()",
  },

  {
    key:
      "Cross-Origin-Opener-Policy",

    value:
      "same-origin",
  },

  {
    key:
      "Cross-Origin-Resource-Policy",

    value:
      "same-origin",
  },

  {
    key:
      "Content-Security-Policy",

    value: [
      "default-src 'self'",

      "style-src 'self' 'unsafe-inline'",

      `script-src ${scriptSources.join(
        " ",
      )}`,

      "img-src 'self' data: blob:",

      `connect-src ${connectSources.join(
        " ",
      )}`,

      "frame-src 'none'",

      "frame-ancestors 'none'",

      "form-action 'self'",

      "base-uri 'self'",

      "object-src 'none'",

      "media-src 'self' blob:",

      "worker-src 'self' blob:",
    ].join(
      "; ",
    ),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader:
    false,

  async headers() {
    return [
      {
        source:
          "/(.*)",

        headers:
          securityHeaders,
      },
    ];
  },
};

export default nextConfig;