import { verifyPaidCheckoutSession } from "../_shared/stripe";

interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ID_JPY?: string;
  STRIPE_PRICE_ID_USD?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const sessionId = new URL(context.request.url).searchParams.get("session_id");
  const result = await verifyPaidCheckoutSession(context.env, sessionId);

  if (!result.ok) {
    return jsonResponse({
      paid: false,
      message: result.reason,
    }, result.status);
  }

  return jsonResponse({
    paid: true,
    currency: result.checkout.currency,
    amount: result.checkout.amount,
    product: result.checkout.product,
  });
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
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}
