interface Env {
  OPENAI_API_KEY?: string;
  STRIPE_SECRET_KEY?: string;
}

interface PagesContext {
  env: Env;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  return jsonResponse({
    ok: true,
    service: "borinef-mdmaker",
    hasOpenAiKey: Boolean(context.env.OPENAI_API_KEY),
    hasStripeKey: Boolean(context.env.STRIPE_SECRET_KEY),
  });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
