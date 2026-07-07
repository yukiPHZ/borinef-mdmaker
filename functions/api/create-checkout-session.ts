import {
  priceIdForLocale,
  validateExportSpecForCheckout,
} from "../_shared/stripe";
import { exportSpecToStripeMetadata } from "../../src/exportSpec";

interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ID_JPY?: string;
  STRIPE_PRICE_ID_USD?: string;
  PUBLIC_SITE_URL?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface CheckoutPayload {
  locale?: "ja" | "en";
  language?: "ja" | "en";
  maker?: string;
  exportSpec?: unknown;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const payload = await readJson<CheckoutPayload>(context.request);
  const locale = payload?.locale === "en" || payload?.language === "en" ? "en" : "ja";
  const priceId = priceIdForLocale(context.env, locale);
  const exportSpecResult = validateExportSpecForCheckout(payload?.exportSpec);

  if (!exportSpecResult.ok) {
    return jsonResponse({
      ok: false,
      message: exportSpecResult.reason,
    }, exportSpecResult.status);
  }

  if (!context.env.STRIPE_SECRET_KEY || !priceId) {
    return jsonResponse({
      ok: false,
      message: "stripe_not_configured",
    }, 503);
  }

  const siteUrl = normalizeSiteUrl(context.env.PUBLIC_SITE_URL, context.request.url);
  const metadata = exportSpecToStripeMetadata(exportSpecResult.spec);
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("payment_method_types[0]", "card");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${siteUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${siteUrl}/?checkout=cancelled`);
  Object.entries(metadata).forEach(([key, value]) => {
    params.set(`metadata[${key}]`, value);
  });

  try {
    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${context.env.STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!stripeResponse.ok) {
      return jsonResponse({
        ok: false,
        message: "stripe_session_failed",
      }, 502);
    }

    const session = (await stripeResponse.json()) as { url?: string };
    return jsonResponse({
      ok: Boolean(session.url),
      checkoutUrl: session.url,
    });
  } catch {
    return jsonResponse({
      ok: false,
      message: "stripe_request_failed",
    }, 502);
  }
}

function normalizeSiteUrl(value: string | undefined, requestUrl: string): string {
  const fallback = requestOrigin(requestUrl);
  if (!value) {
    return fallback;
  }
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || !url.hostname) {
      return fallback;
    }
    return url.origin;
  } catch {
    return fallback;
  }
}

function requestOrigin(requestUrl: string): string {
  try {
    const url = new URL(requestUrl);
    if (url.protocol === "https:" && url.hostname) {
      return url.origin;
    }
  } catch {
    // Fall through to the canonical production origin.
  }
  return "https://mdmaker.borinef.com";
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function corsHeaders(): HeadersInit {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
