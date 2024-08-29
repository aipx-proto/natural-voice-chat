import assert from "assert";
import { createProxyMiddleware } from "http-proxy-middleware";

export function createOpenAIProxyMiddleware() {
  assert(process.env.OPENAI_ENDPOINT, "OPENAI_ENDPOINT is required");
  assert(process.env.OPENAI_API_KEY, "OPENAI API KEY is required");

  return createProxyMiddleware({
    target: `${process.env.OPENAI_ENDPOINT!}/openai`,
    headers: { "api-key": process.env.OPENAI_API_KEY! },
    changeOrigin: true,
    on: {
      proxyReq: (proxyRes, req, res) => {
        res.on("close", () => {
          proxyRes.destroy();
        });
      },
    },
  });
}
