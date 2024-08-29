import assert from "assert";
import type { RequestHandler } from "express";

export function getCognitiveServiceEndoint(): RequestHandler {
  assert(process.env.COGNITIVE_SERVICE_REGION, "COGNITIVE_SERVICE_REGION is not defined");
  assert(process.env.COGNITIVE_SERVICES_KEY, "COGNITIVE_SERVICES_KEY is not defined");

  async function getToken() {
    const url = `https://${process.env.COGNITIVE_SERVICE_REGION!}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": "0",
        "Ocp-Apim-Subscription-Key": process.env.COGNITIVE_SERVICES_KEY!,
      },
    }).then((response) => response.text());
  }

  return async function (_request, response) {
    const token = await getToken();
    response.json({ token, region: process.env.COGNITIVE_SERVICE_REGION });
  };
}
