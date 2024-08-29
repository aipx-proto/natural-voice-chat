import express from "express";
import path from "node:path";
import { getCognitiveServiceEndoint } from "./lib/get-cognitive-service-token";
import { logError, logRoute } from "./lib/logger";
import { createOpenAIProxyMiddleware } from "./lib/openai-proxy";

const isProduction = process.env.NODE_ENV === "production";
const port = process.env.PORT || 3000;
const app = express();
const staticDir = path.join(__dirname, "../dist/static");
console.log({ isProduction, port, staticDir });

// proxy must be before json middleware
// ref: https://github.com/chimurai/http-proxy-middleware/issues/320
app.use("/proxy/openai", createOpenAIProxyMiddleware());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get("/api/cognitive/endpoint", getCognitiveServiceEndoint());

app.use(express.static(staticDir));
app.get("*", function (_request, response) {
  // catch all other routes with SPA root
  response.sendFile(path.join(staticDir, "index.html"));
});

app.use(logRoute);
app.use(logError);

console.log(`[server] Listening at port ${port}`);
