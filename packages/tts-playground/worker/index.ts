import type {
  AnalyzeAzurePhonemeAlphabet,
  AnalyzeErrorResponse,
  AnalyzeSuccessResponse,
} from "@japanese-tts-analyzer/analyze-contract";
import {
  buildAzureSampleResult,
  DEFAULT_AZURE_PHONEME_ALPHABET,
  findSampleCaseByText,
} from "../src/sample-support";

interface AnalyzeInput {
  text: string;
  locale: string;
  voice: string;
  includeDebug: boolean;
  azurePhonemeAlphabet: AnalyzeAzurePhonemeAlphabet;
}

interface PlaygroundWorkerEnv {
  ASSETS: Fetcher;
  ANALYZE_API_BASE_URL?: string;
  ANALYZE_API_TOKEN?: string;
}

type AnalyzeBackendMode = "mock" | "proxy";

const ANALYZE_BACKEND_MODE_HEADER = "X-Analyze-Backend-Mode";

const worker = {
  async fetch(request: Request, env: PlaygroundWorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze") {
      if (request.method === "OPTIONS") {
        return withCors(createOptionsResponse());
      }

      if (request.method !== "POST") {
        return withCors(
          createAnalyzeErrorResponse(
            "METHOD_NOT_ALLOWED",
            "Only POST is supported.",
            405
          )
        );
      }

      if (env.ANALYZE_API_BASE_URL?.trim()) {
        return withCors(
          withAnalyzeBackendMode(await proxyAnalyzeRequest(request, env), "proxy")
        );
      }

      const payload: unknown = await request.json();
      const analyzeRequest = isRecord(payload) ? payload : null;
      const text =
        typeof analyzeRequest?.text === "string" ? analyzeRequest.text.trim() : "";
      const locale =
        typeof analyzeRequest?.locale === "string" ? analyzeRequest.locale : "ja-JP";
      const voice =
        typeof analyzeRequest?.voice === "string" && analyzeRequest.voice
          ? analyzeRequest.voice
          : "ja-JP-NanamiNeural";
      const includeDebug = Boolean(analyzeRequest?.includeDebug);
      const azurePhonemeAlphabet =
        analyzeRequest?.azurePhonemeAlphabet === "ipa"
          ? "ipa"
          : DEFAULT_AZURE_PHONEME_ALPHABET;

      if (!text) {
        return withCors(
          createAnalyzeErrorResponse("BAD_REQUEST", "text is required.", 400)
        );
      }

      return withCors(
        withAnalyzeBackendMode(
          Response.json(
            createAnalyzeResponse({
              text,
              locale,
              voice,
              includeDebug,
              azurePhonemeAlphabet,
            })
          ),
          "mock"
        )
      );
    }

    if (url.pathname === "/api/azure/synthesize") {
      if (request.method === "OPTIONS") {
        return withCors(createOptionsResponse());
      }

      if (request.method !== "POST") {
        return withCors(
          Response.json(
            {
              error: "Method Not Allowed",
            },
            { status: 405 }
          )
        );
      }

      const payload: unknown = await request.json();
      const synthesizeRequest = isRecord(payload) ? payload : null;
      const subscriptionKey =
        typeof synthesizeRequest?.subscriptionKey === "string"
          ? synthesizeRequest.subscriptionKey
          : "";
      const region =
        typeof synthesizeRequest?.region === "string" ? synthesizeRequest.region : "";
      const ssml =
        typeof synthesizeRequest?.ssml === "string" ? synthesizeRequest.ssml : "";
      const outputFormat =
        typeof synthesizeRequest?.outputFormat === "string" &&
        synthesizeRequest.outputFormat
          ? synthesizeRequest.outputFormat
          : "audio-24khz-48kbitrate-mono-mp3";

      if (!subscriptionKey || !region || !ssml) {
        return withCors(
          Response.json(
            {
              error: "Bad Request",
              details: "subscriptionKey, region, ssml are required.",
            },
            { status: 400 }
          )
        );
      }

      const upstream = await fetch(
        `https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,
        {
          method: "POST",
          headers: {
            "Ocp-Apim-Subscription-Key": subscriptionKey,
            "Content-Type": "application/ssml+xml",
            "X-Microsoft-OutputFormat": outputFormat,
            "User-Agent": "japanese-tts-analyzer-tts-playground",
          },
          body: ssml,
        }
      );

      if (!upstream.ok) {
        const details = await upstream.text();
        return withCors(
          Response.json(
            {
              error: "Azure synthesis failed",
              details,
            },
            { status: upstream.status }
          )
        );
      }

      const headers = new Headers();
      headers.set(
        "Content-Type",
        upstream.headers.get("content-type") || "audio/mpeg"
      );
      headers.set("Cache-Control", "no-store");

      return withCors(
        new Response(upstream.body, {
          status: upstream.status,
          headers,
        })
      );
    }

    if (url.pathname === "/api/health") {
      return Response.json({
        status: "ok",
        service: "japanese-tts-analyzer-tts-playground",
      });
    }

    if (url.pathname.startsWith("/api/")) {
      return Response.json(
        {
          error: "Not Found",
        },
        { status: 404 }
      );
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<PlaygroundWorkerEnv>;

export default worker;

const createOptionsResponse = (): Response =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });

const createAnalyzeErrorResponse = (
  code: AnalyzeErrorResponse["error"]["code"],
  message: string,
  status: number
): Response =>
  Response.json(
    {
      error: {
        code,
        message,
      },
    },
    { status }
  );

const proxyAnalyzeRequest = async (
  request: Request,
  env: PlaygroundWorkerEnv
): Promise<Response> => {
  const analyzeApiBaseUrl = env.ANALYZE_API_BASE_URL?.trim();
  if (!analyzeApiBaseUrl) {
    return createAnalyzeErrorResponse(
      "ANALYZE_BACKEND_UNAVAILABLE",
      "ANALYZE_API_BASE_URL is not configured.",
      503
    );
  }

  const upstreamUrl = new URL("/analyze", analyzeApiBaseUrl);
  const headers = new Headers();
  headers.set(
    "Content-Type",
    request.headers.get("content-type") ?? "application/json"
  );

  if (env.ANALYZE_API_TOKEN?.trim()) {
    headers.set("Authorization", `Bearer ${env.ANALYZE_API_TOKEN.trim()}`);
  }

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers,
      body: await request.text(),
    });

    return copyResponse(upstream);
  } catch {
    return createAnalyzeErrorResponse(
      "ANALYZE_BACKEND_UNAVAILABLE",
      "Analyze backend is temporarily unavailable.",
      503
    );
  }
};

const copyResponse = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set("Cache-Control", headers.get("Cache-Control") ?? "no-store");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const withAnalyzeBackendMode = (
  response: Response,
  mode: AnalyzeBackendMode
): Response => {
  const headers = new Headers(response.headers);
  headers.set(ANALYZE_BACKEND_MODE_HEADER, mode);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/**
 * Contract-aligned mock response builder for the Azure-first free-text flow.
 * This remains a mock until the real UniDic backend is connected.
 */
const createAnalyzeResponse = ({
  text,
  locale,
  voice,
  includeDebug,
  azurePhonemeAlphabet,
}: AnalyzeInput): AnalyzeSuccessResponse => {
  const sample = findSampleCaseByText(text);

  if (sample) {
    const result = buildAzureSampleResult({
      tokens: sample.tokens,
      locale,
      voice,
      azurePhonemeAlphabet,
    });

    return {
      text,
      locale,
      accentIR: result.accentIR,
      azureSSML: result.ssml,
      warnings: result.warnings,
      ...(includeDebug ? { debug: { rawTokens: [...result.rawTokens] } } : {}),
    };
  }

  const plainTextSSML = wrapWithVoice(escapeXml(text), locale, voice);

  return {
    text,
    locale,
    accentIR: {
      locale,
      segments: [
        {
          type: "text",
          text,
        },
      ],
    },
    azureSSML: plainTextSSML,
    warnings: [
      {
        code: "AZURE_FALLBACK_TO_PLAIN_TEXT",
        message:
          "現在の /api/analyze は contract 準拠の mock 実装です。未登録テキストは plain text fallback で返します。",
        segmentIndex: 0,
      },
    ],
    ...(includeDebug ? { debug: { rawTokens: [] } } : {}),
  };
};

const wrapWithVoice = (body: string, locale: string, voice: string): string =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}"><voice name="${voice}">${body}</voice></speak>`;

const escapeXml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const withCors = (response: Response): Response => {
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Expose-Headers", ANALYZE_BACKEND_MODE_HEADER);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};
