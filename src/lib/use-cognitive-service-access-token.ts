import { useEffect, useRef } from "react";
import { deferred } from "./deffered";

/**
 * Get the token for cognitive service APIs
 */
export function useCognitiveServiceAccessToken() {
  const initDeferred = useRef(deferred<void>());
  const latestToken = useRef<string>("");
  const latestRegion = useRef<string>("");

  // 5 minute interval token refresh
  useEffect(() => {
    const fetchToken = async () => {
      const { token, region } = await fetch("/api/cognitive/endpoint").then((res) => res.json());
      latestToken.current = token;
      latestRegion.current = region;
      initDeferred.current.resolve();
    };

    fetchToken();
    const interval = setInterval(fetchToken, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  async function getEndpoint() {
    await initDeferred.current.promise;
    return {
      token: latestToken.current,
      region: latestRegion.current,
    };
  }

  return { getEndpoint };
}
