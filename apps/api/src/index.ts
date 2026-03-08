import express from "express";
import cors from "cors";
import tasksRouter from "./routes/tasks";

const app = express();
const PORT = process.env.PORT ?? 3001;
const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL ?? "";

app.use(cors({ origin: true, credentials: true }));

// Proxy auth routes to Convex — before express.json() so the raw body streams through untouched
app.all("/api/auth/*splat", async (req, res) => {
  const url = `${CONVEX_SITE_URL}${req.path}${req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : ""}`;
  const headers: Record<string, string> = {};
  if (req.headers["content-type"]) headers["content-type"] = req.headers["content-type"];
  if (req.headers.cookie) headers.cookie = req.headers.cookie;

  const upstream = await fetch(url, {
    method: req.method,
    headers,
    body: ["GET", "HEAD"].includes(req.method) ? undefined : req as unknown as ReadableStream,
    // @ts-ignore — required for streaming request bodies in Node 18+
    duplex: "half",
  });

  upstream.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(upstream.status).send(Buffer.from(await upstream.arrayBuffer()));
});

app.use(express.json());
app.use("/api/tasks", tasksRouter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.listen(PORT, () => {
  console.log(`API server running on http://localhost:${PORT}`);
});

export default app;
