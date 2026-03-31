import type { UniDicRawToken } from "@japanese-tts-analyzer/accent-ir";

export interface TokenOverrideMatch {
  tokens: UniDicRawToken[];
  nextIndex: number;
}

export interface ParsedNumericSpan {
  originalText: string;
  normalizedText: string;
  integerPart: string;
  fractionalPart?: string;
  nextIndex: number;
  tokenCount: number;
}
