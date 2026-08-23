import "server-only";

import { createHash } from "crypto";

import {
  createServiceClient,
} from "@/lib/supabase/service";

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  unavailable?: boolean;
};

type ConsumeRateLimitOptions = {
  namespace: string;
  identifier: string;
  limit: number;
  windowSeconds: number;
};

function hashIdentifier(
  value: string,
) {
  return createHash(
    "sha256",
  )
    .update(
      value,
    )
    .digest(
      "hex",
    );
}

export function getClientIp(
  request: Request,
) {
  /*
   * Cloudflare
   */
  const cfConnectingIp =
    request.headers
      .get(
        "cf-connecting-ip",
      )
      ?.trim();

  if (cfConnectingIp) {
    return cfConnectingIp;
  }

  /*
   * Reverse proxy / Vercel / Nginx
   */
  const forwardedFor =
    request.headers
      .get(
        "x-forwarded-for",
      )
      ?.split(
        ",",
      )[0]
      ?.trim();

  if (forwardedFor) {
    return forwardedFor;
  }

  /*
   * Proxy alternatif
   */
  const realIp =
    request.headers
      .get(
        "x-real-ip",
      )
      ?.trim();

  if (realIp) {
    return realIp;
  }

  /*
   * Ne jamais utiliser une valeur vide comme
   * identifiant du rate limit.
   */
  return "unknown";
}

export async function consumeRateLimit({
  namespace,
  identifier,
  limit,
  windowSeconds,
}: ConsumeRateLimitOptions): Promise<RateLimitResult> {
  /*
   * ============================================
   * VALIDATION
   * ============================================
   */

  if (
    !namespace.trim()
  ) {
    throw new Error(
      "Le namespace du rate limit est obligatoire.",
    );
  }

  if (
    !identifier.trim()
  ) {
    throw new Error(
      "L’identifiant du rate limit est obligatoire.",
    );
  }

  if (
    !Number.isInteger(
      limit,
    ) ||
    limit <= 0
  ) {
    throw new Error(
      "La limite du rate limit est invalide.",
    );
  }

  if (
    !Number.isInteger(
      windowSeconds,
    ) ||
    windowSeconds <= 0
  ) {
    throw new Error(
      "La fenêtre du rate limit est invalide.",
    );
  }

  /*
   * ============================================
   * CLIENT SUPABASE SERVEUR
   * ============================================
   */

  const serviceClient =
    createServiceClient();

  /*
   * ============================================
   * HASH DE L'IDENTIFIANT
   * ============================================
   */

  const identifierHash =
    hashIdentifier(
      `${namespace}:${identifier}`,
    );

  /*
   * ============================================
   * CONSOMMATION DU RATE LIMIT
   * ============================================
   */

  const {
    data,
    error,
  } =
    await serviceClient.rpc(
      "consume_api_rate_limit",
      {
        p_namespace:
          namespace,

        p_identifier_hash:
          identifierHash,

        p_limit:
          limit,

        p_window_seconds:
          windowSeconds,
      },
    );

  /*
   * ============================================
   * PANNE DU MÉCANISME
   * ============================================
   *
   * En production, on préfère bloquer
   * temporairement plutôt que laisser passer
   * toutes les requêtes sans protection.
   */

  if (error) {
    console.error(
      "Erreur rate limiting :",
      error.message,
    );

    return {
      allowed:
        false,

      remaining:
        0,

      retryAfterSeconds:
        30,

      unavailable:
        true,
    };
  }

  /*
   * ============================================
   * NORMALISATION DE LA RÉPONSE RPC
   * ============================================
   */

  const result =
    Array.isArray(
      data,
    )
      ? data[0]
      : data;

  if (
    !result
  ) {
    console.error(
      "Réponse rate limiting vide.",
    );

    return {
      allowed:
        false,

      remaining:
        0,

      retryAfterSeconds:
        30,

      unavailable:
        true,
    };
  }

  const allowed =
    Boolean(
      result.allowed,
    );

  const remaining =
    Math.max(
      0,
      Number(
        result.remaining ??
          0,
      ),
    );

  const retryAfterSeconds =
    Math.max(
      0,
      Number(
        result.retry_after_seconds ??
          0,
      ),
    );

  return {
    allowed,
    remaining,
    retryAfterSeconds,
    unavailable:
      false,
  };
}