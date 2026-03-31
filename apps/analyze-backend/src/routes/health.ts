import type { JsonRouteResponse } from "./http.js";

export const handleHealthRequest = (): JsonRouteResponse => ({
  status: 200,
  body: {
    status: "ok",
    service: "japanese-tts-analyzer-analyze-backend",
    runtime: "container",
  },
});
