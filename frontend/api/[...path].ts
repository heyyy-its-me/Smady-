import type { IncomingMessage, ServerResponse } from "node:http";

type ProxyRequest = IncomingMessage & { body?: unknown };
type HeaderBag = Headers & { getSetCookie?: () => string[] };

const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

export default async function handler(req: ProxyRequest, res: ServerResponse) {
  const backendBase = process.env.BACKEND_API_URL?.trim().replace(/\/+$/, "");
  if (!backendBase) {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ detail: "Backend API is not configured" }));
    return;
  }

  const requestPath = req.url || "/api";
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (HOP_BY_HOP_HEADERS.has(name.toLowerCase()) || value === undefined) continue;
    headers.set(name, Array.isArray(value) ? value.join(", ") : value);
  }

  let body: BodyInit | undefined;
  if (req.method !== "GET" && req.method !== "HEAD") {
    if (typeof req.body === "string") body = req.body;
    else if (Buffer.isBuffer(req.body)) body = req.body;
    else if (req.body !== undefined) {
      body = JSON.stringify(req.body);
      if (!headers.has("content-type")) headers.set("content-type", "application/json");
    }
  }

  try {
    const upstream = await fetch(`${backendBase}${requestPath}`, {
      method: req.method,
      headers,
      body,
      redirect: "manual",
    });
    res.statusCode = upstream.status;
    upstream.headers.forEach((value, name) => {
      if (name.toLowerCase() !== "set-cookie") res.setHeader(name, value);
    });
    const setCookies = (upstream.headers as HeaderBag).getSetCookie?.();
    const setCookieHeader = setCookies?.length ? setCookies : upstream.headers.get("set-cookie");
    if (setCookieHeader) res.setHeader("set-cookie", setCookieHeader);
    res.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    res.statusCode = 502;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ detail: "Backend API unavailable" }));
  }
}
