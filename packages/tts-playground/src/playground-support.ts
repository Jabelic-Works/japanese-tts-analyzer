import {
  type AccentIR,
  type AccentIREmitWarning,
  type UniDicRawToken,
} from "@japanese-tts-analyzer/accent-ir";
import type {
  AnalyzeAzurePhonemeAlphabet,
  AnalyzeErrorResponse,
  AnalyzeSuccessResponse,
} from "@japanese-tts-analyzer/analyze-contract";
import {
  buildAzureSampleResult,
  DEFAULT_AZURE_PHONEME_ALPHABET,
  findSampleCaseById,
} from "./sample-support";

export { DEFAULT_AZURE_PHONEME_ALPHABET, SAMPLE_CASES } from "./sample-support";

export const DEFAULT_VOICE = "ja-JP-NanamiNeural";
export const DEFAULT_OUTPUT_FORMAT = "audio-24khz-48kbitrate-mono-mp3";

export const SESSION_KEYS = {
  subscriptionKey: "azure-subscription-key",
  region: "azure-region",
  voice: "azure-voice",
  outputFormat: "azure-output-format",
  azurePhonemeAlphabet: "azure-phoneme-alphabet",
} as const;

export type AnalyzeBackendMode = "mock" | "proxy" | "unknown";

export const readSessionValue = (key: string, fallback = ""): string => {
  if (typeof window === "undefined") {
    return fallback;
  }

  return window.sessionStorage.getItem(key) ?? fallback;
};

export const writeSessionValue = (key: string, value: string): void => {
  if (typeof window === "undefined") {
    return;
  }

  if (value) {
    window.sessionStorage.setItem(key, value);
    return;
  }

  window.sessionStorage.removeItem(key);
};

export const readAzurePhonemeAlphabet = (
  value: string
): AnalyzeAzurePhonemeAlphabet =>
  value === "ipa" ? "ipa" : DEFAULT_AZURE_PHONEME_ALPHABET;

export const buildSampleSSML = (
  sampleId: string,
  voice: string,
  azurePhonemeAlphabet: AnalyzeAzurePhonemeAlphabet
): {
  accentIR: AccentIR;
  ssml: string;
  warnings: AccentIREmitWarning[];
  rawTokens: readonly UniDicRawToken[];
} => {
  const sample = findSampleCaseById(sampleId);
  const result = buildAzureSampleResult({
    tokens: sample.tokens,
    voice: voice || DEFAULT_VOICE,
    azurePhonemeAlphabet,
  });

  return {
    accentIR: result.accentIR,
    ssml: result.ssml,
    warnings: result.warnings,
    rawTokens: result.rawTokens,
  };
};

export const readErrorMessage = async (response: Response): Promise<string> => {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.json()) as
      | AnalyzeErrorResponse
      | { error?: string; details?: string };

    if (typeof payload.error === "string") {
      return "details" in payload && typeof payload.details === "string"
        ? `${payload.error}: ${payload.details}`
        : payload.error;
    }

    if (isRecord(payload.error) && typeof payload.error.message === "string") {
      return typeof payload.error.code === "string"
        ? `${payload.error.code}: ${payload.error.message}`
        : payload.error.message;
    }

    return response.statusText;
  }

  const text = await response.text();
  return text || response.statusText;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export const readAnalyzeBackendMode = (response: Response): AnalyzeBackendMode => {
  const mode = response.headers.get("x-analyze-backend-mode");

  if (mode === "mock" || mode === "proxy") {
    return mode;
  }

  return "unknown";
};

export const readAnalyzeResponse = (
  payload: unknown
): {
  accentIR: AccentIR;
  azureSSML: string;
  warnings: AccentIREmitWarning[];
  rawTokens: UniDicRawToken[] | null;
} => {
  if (!isRecord(payload)) {
    throw new Error("Analyze API response must be an object.");
  }

  const response = payload as Partial<AnalyzeSuccessResponse>;

  const accentIR = response.accentIR;
  if (!accentIR) {
    throw new Error("Analyze API response is missing accentIR.");
  }

  const azureSSML =
    typeof response.azureSSML === "string" ? response.azureSSML : "";
  if (!azureSSML) {
    throw new Error("Analyze API response is missing azureSSML.");
  }

  const warnings = Array.isArray(response.warnings)
    ? (response.warnings as AccentIREmitWarning[])
    : [];

  const debug = isRecord(response.debug) ? response.debug : undefined;
  const rawTokens = Array.isArray(debug?.rawTokens)
    ? (debug.rawTokens.filter(isRecord) as UniDicRawToken[])
    : null;

  return {
    accentIR,
    azureSSML,
    warnings,
    rawTokens,
  };
};
