import {
  adaptUniDicTokensToAccentIR,
  emitAzureSSML,
  type AccentIR,
  type AccentIREmitWarning,
  type UniDicRawToken,
} from "@japanese-tts-analyzer/accent-ir";
import type { AnalyzeAzurePhonemeAlphabet } from "@japanese-tts-analyzer/analyze-contract";

export const DEFAULT_AZURE_PHONEME_ALPHABET: AnalyzeAzurePhonemeAlphabet = "sapi";

export interface AccentIRSample {
  id: string;
  label: string;
  analyzeText: string;
  tokens: readonly UniDicRawToken[];
}

export interface AzureSampleResult {
  accentIR: AccentIR;
  ssml: string;
  warnings: AccentIREmitWarning[];
  rawTokens: readonly UniDicRawToken[];
}

const NOUN_GENERAL = {
  level1: "名詞",
  level2: "普通名詞",
  level3: "一般",
} as const;

const NOUN_PROPER = {
  level1: "名詞",
  level2: "固有名詞",
  level3: "地名",
} as const;

const PARTICLE_CASE = {
  level1: "助詞",
  level2: "格助詞",
} as const;

const VERB_GENERAL = {
  level1: "動詞",
  level2: "一般",
} as const;

const SYMBOL_PERIOD = {
  level1: "補助記号",
  level2: "句点",
} as const;

export const SAMPLE_CASES: readonly AccentIRSample[] = [
  {
    id: "hashi-chopsticks",
    label: "箸 (1型)",
    analyzeText: "箸",
    tokens: [
      {
        surface: "箸",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: NOUN_GENERAL,
        accent: {
          accentType: "1",
        },
      },
    ],
  },
  {
    id: "hashi-bridge",
    label: "橋 (2型)",
    analyzeText: "橋",
    tokens: [
      {
        surface: "橋",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: NOUN_GENERAL,
        accent: {
          accentType: "2",
        },
      },
    ],
  },
  {
    id: "hashi-edge",
    label: "端 (平板)",
    analyzeText: "端",
    tokens: [
      {
        surface: "端",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: NOUN_GENERAL,
        accent: {
          accentType: "0",
        },
      },
    ],
  },
  {
    id: "tokyo-proper-noun",
    label: "東京",
    analyzeText: "東京",
    tokens: [
      {
        surface: "東京",
        reading: "トウキョウ",
        pronunciation: "トーキョー",
        partOfSpeech: NOUN_PROPER,
        accent: {
          accentType: "0",
        },
      },
    ],
  },
  {
    id: "hashi-wo-motsu",
    label: "箸を持つ。",
    analyzeText: "箸を持つ。",
    tokens: [
      {
        surface: "箸",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: NOUN_GENERAL,
        accent: {
          accentType: "1",
        },
      },
      {
        surface: "を",
        reading: "ヲ",
        pronunciation: "オ",
        partOfSpeech: PARTICLE_CASE,
      },
      {
        surface: "持つ",
        reading: "モツ",
        pronunciation: "モツ",
        partOfSpeech: VERB_GENERAL,
        accent: {
          accentType: "1",
        },
      },
      {
        surface: "。",
        partOfSpeech: SYMBOL_PERIOD,
      },
    ],
  },
] as const;

export const findSampleCaseById = (sampleId: string): AccentIRSample =>
  SAMPLE_CASES.find((candidate) => candidate.id === sampleId) ?? SAMPLE_CASES[0];

export const findSampleCaseByText = (
  text: string
): AccentIRSample | undefined =>
  SAMPLE_CASES.find((candidate) => candidate.analyzeText === text);

export const buildAzureSampleResult = (input: {
  tokens: readonly UniDicRawToken[];
  locale?: string;
  voice?: string;
  azurePhonemeAlphabet?: AnalyzeAzurePhonemeAlphabet;
}): AzureSampleResult => {
  const locale = input.locale ?? "ja-JP";
  const adapted = adaptUniDicTokensToAccentIR({
    locale,
    tokens: input.tokens,
    ...(input.azurePhonemeAlphabet === "ipa"
      ? {
          azurePhonemeMode: {
            alphabet: "ipa" as const,
            unit: "contentPlusParticles" as const,
          },
        }
      : {}),
  });
  const emitted = emitAzureSSML(adapted.accentIR, {
    locale,
    voice: input.voice,
  });

  return {
    accentIR: adapted.accentIR,
    ssml: emitted.ssml,
    warnings: emitted.warnings,
    rawTokens: input.tokens,
  };
};
