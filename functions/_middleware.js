export const RETIREMENT_URL = "https://start.peakheadz.com/shipments/md-maker/";

export function onRequest() {
  return Response.redirect(RETIREMENT_URL, 301);
}
