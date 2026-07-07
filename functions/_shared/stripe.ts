import {
  parseExportSpecV1,
  stripeMetadataToExportSpec,
} from "../../src/exportSpec";
import type { ExportSpecV1 } from "../../src/types";

export interface StripeEnv {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ID_JPY?: string;
  STRIPE_PRICE_ID_USD?: string;
}

export interface VerifiedCheckout {
  sessionId: string;
  currency: string;
  amount: number;
  product: "design-md-export-v1";
  exportSpec: ExportSpecV1;
}

type VerificationResult =
  | { ok: true; checkout: VerifiedCheckout }
  | { ok: false; status: number; reason: string };

type ExportSpecValidationResult =
  | { ok: true; spec: ExportSpecV1 }
  | { ok: false; status: number; reason: string };

interface StripeProduct {
  id?: string;
  metadata?: Record<string, string>;
}

interface StripePrice {
  id?: string;
  currency?: string;
  unit_amount?: number;
  product?: string | StripeProduct;
}

interface StripeLineItem {
  quantity?: number;
  price?: StripePrice;
}

interface StripeSession {
  id?: string;
  mode?: string;
  status?: string;
  payment_status?: string;
  currency?: string;
  amount_total?: number;
  metadata?: Record<string, string>;
  line_items?: {
    data?: StripeLineItem[];
  };
}

export function allowedPriceIds(env: StripeEnv): string[] {
  return [env.STRIPE_PRICE_ID_JPY, env.STRIPE_PRICE_ID_USD].filter(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  );
}

export function priceIdForLocale(env: StripeEnv, locale: "ja" | "en"): string | undefined {
  return locale === "en" ? env.STRIPE_PRICE_ID_USD : env.STRIPE_PRICE_ID_JPY;
}

export function validateExportSpecForCheckout(value: unknown): ExportSpecValidationResult {
  const parsed = parseExportSpecV1(value);
  if (!parsed.ok) {
    return { ok: false, status: 400, reason: parsed.reason };
  }
  return { ok: true, spec: parsed.spec };
}

export async function verifyPaidCheckoutSession(env: StripeEnv, sessionId: string | null): Promise<VerificationResult> {
  if (!env.STRIPE_SECRET_KEY) {
    return { ok: false, status: 503, reason: "stripe_not_configured" };
  }

  const normalizedSessionId = normalizeSessionId(sessionId);
  if (!normalizedSessionId) {
    return { ok: false, status: 400, reason: "invalid_session_id" };
  }

  const prices = allowedPriceIds(env);
  if (prices.length === 0) {
    return { ok: false, status: 503, reason: "stripe_price_not_configured" };
  }

  const session = await retrieveCheckoutSession(env.STRIPE_SECRET_KEY, normalizedSessionId);
  if (!session) {
    return { ok: false, status: 404, reason: "checkout_session_not_found" };
  }

  if (session.mode !== "payment" || session.status !== "complete" || session.payment_status !== "paid") {
    return { ok: false, status: 402, reason: "checkout_not_paid" };
  }

  const lineItem = session.line_items?.data?.[0];
  const price = lineItem?.price;
  if (!lineItem || lineItem.quantity !== 1 || !price?.id || !prices.includes(price.id)) {
    return { ok: false, status: 403, reason: "checkout_price_not_allowed" };
  }

  const productCode = productMetadata(price.product).product_code ?? session.metadata?.product_code;
  if (productCode !== "design-md-export-v1") {
    return { ok: false, status: 403, reason: "checkout_product_not_allowed" };
  }

  const specResult = stripeMetadataToExportSpec(session.metadata ?? {});
  if (!specResult.ok) {
    return { ok: false, status: 400, reason: specResult.reason };
  }

  return {
    ok: true,
    checkout: {
      sessionId: normalizedSessionId,
      currency: normalizeCurrency(price.currency ?? session.currency),
      amount: normalizeAmount(price.unit_amount ?? session.amount_total),
      product: "design-md-export-v1",
      exportSpec: specResult.spec,
    },
  };
}

async function retrieveCheckoutSession(secretKey: string, sessionId: string): Promise<StripeSession | null> {
  const url = new URL(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`);
  url.searchParams.append("expand[]", "line_items.data.price.product");

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as StripeSession;
  } catch {
    return null;
  }
}

function normalizeSessionId(value: string | null): string | null {
  if (!value || value.length > 200) {
    return null;
  }
  return /^cs_(test|live)_[A-Za-z0-9_]+$/.test(value) ? value : null;
}

function productMetadata(product: StripePrice["product"]): Record<string, string> {
  if (!product || typeof product === "string") {
    return {};
  }
  return product.metadata ?? {};
}

function normalizeCurrency(value: unknown): string {
  return typeof value === "string" && /^[a-z]{3}$/.test(value) ? value : "";
}

function normalizeAmount(value: unknown): number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : 0;
}
