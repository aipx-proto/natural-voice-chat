import { useEffect, useRef } from "react";
import { deferred } from "./deffered";

/**
 * Get the token for cognitive service APIs
 */
export function useCognitiveServiceAccessToken(options: { region: string; apiKey: string }) {
  const initDeferred = useRef(deferred<void>());
  const latestToken = useRef<string>("");
  const latestRegion = useRef<string>("");

  // 5 minute interval token refresh
  useEffect(() => {
    const fetchToken = async () => {
      const token = await getToken(options.region, options.apiKey);
      latestToken.current = token;
      latestRegion.current = options.region;
      initDeferred.current.resolve();
    };

    fetchToken();
    const interval = setInterval(fetchToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [options.region, options.apiKey]);

  async function getEndpoint() {
    await initDeferred.current.promise;
    return {
      token: latestToken.current,
      region: latestRegion.current,
    };
  }

  return { getEndpoint };
}

async function getToken(region: string, apiKey: string) {
  const url = `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issueToken`;

  return fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": "0",
      "Ocp-Apim-Subscription-Key": apiKey,
    },
  }).then((response) => response.text());
}
