interface Env {
  STRIPE_SECRET_KEY?: string;
  STRIPE_PRICE_ID_JPY?: string;
  STRIPE_PRICE_ID_USD?: string;
}

interface PagesContext {
  request: Request;
  env: Env;
}

interface CheckoutPayload {
  language?: "ja" | "en";
  maker?: string;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const payload = await readJson<CheckoutPayload>(context.request);
  const language = payload?.language === "en" ? "en" : "ja";
  const priceId = language === "en" ? context.env.STRIPE_PRICE_ID_USD : context.env.STRIPE_PRICE_ID_JPY;

  if (!context.env.STRIPE_SECRET_KEY || !priceId) {
    return jsonResponse({
      ok: false,
      source: "fallback",
      message: "stripe_not_configured",
    });
  }

  const origin = new URL(context.request.url).origin;
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("line_items[0][price]", priceId);
  params.set("line_items[0][quantity]", "1");
  params.set("success_url", `${origin}/?paid=1&session_id={CHECKOUT_SESSION_ID}#maker`);
  params.set("cancel_url", `${origin}/#maker`);
  params.set("metadata[maker]", payload?.maker ?? "design.md");
  params.set("metadata[service]", "borinef-mdmaker");

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
        source: "fallback",
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
      source: "fallback",
      message: "stripe_request_failed",
    }, 502);
  }
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
