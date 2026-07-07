import { buildMakerStateFromExportSpec } from "../../src/exportSpec";
import {
  buildExportZip,
  buildGeneratedFiles,
  exportZipFileName,
} from "../../src/zip/buildZip";
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

interface DownloadPayload {
  session_id?: string;
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, { headers: corsHeaders() });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const payload = await readJson<DownloadPayload>(context.request);
  const result = await verifyPaidCheckoutSession(context.env, payload?.session_id ?? null);

  if (!result.ok) {
    return jsonResponse({
      ok: false,
      message: result.reason,
    }, result.status);
  }

  const makerState = buildMakerStateFromExportSpec(result.checkout.exportSpec);
  const files = buildGeneratedFiles(makerState);
  const zip = await buildExportZip(files);

  return new Response(zip, {
    headers: {
      ...corsHeaders(),
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${exportZipFileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
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
      "Cache-Control": "private, no-store",
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
