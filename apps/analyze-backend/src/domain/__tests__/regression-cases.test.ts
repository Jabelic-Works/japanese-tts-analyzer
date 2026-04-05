import { adaptUniDicTokensToAccentIR, emitAzureSSML } from "@japanese-tts-analyzer/accent-ir";
import { describe, expect, it } from "vitest";
import { applyTokenOverrides } from "../token-overrides/index.js";
import {
  regressionCases,
  toComparableToken,
} from "./fixtures/regression-cases.js";

const wrapAzureSSML = (body: string): string =>
  `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP"><voice name="ja-JP-NanamiNeural">${body}</voice></speak>`;

describe("analyze-backend regression cases", () => {
  for (const testCase of regressionCases) {
    it(`${testCase.description}: token overrides`, () => {
      const overriddenTokens = applyTokenOverrides(testCase.rawTokens);

      expect(overriddenTokens.map(toComparableToken)).toEqual(
        testCase.expectedOverrideTokens
      );
    });

    it(`${testCase.description}: Azure SSML`, () => {
      const overriddenTokens = applyTokenOverrides(testCase.rawTokens);
      const adapted = adaptUniDicTokensToAccentIR({
        locale: "ja-JP",
        tokens: overriddenTokens,
        azureHintMode: "explicit-only",
      });
      const emitted = emitAzureSSML(adapted.accentIR, {
        locale: "ja-JP",
        voice: "ja-JP-NanamiNeural",
        azureReadingFallback: "plainText",
      });

      expect(adapted.warnings).toEqual([]);
      expect(emitted.warnings).toEqual([]);
      expect(emitted.ssml).toBe(wrapAzureSSML(testCase.expectedAzureSSMLBody));
    });
  }

  it("explicit-only と ipa mode を併用すると free-text backend でも ipa phoneme を生成する", () => {
    const overriddenTokens = applyTokenOverrides([
      {
        surface: "東京",
        reading: "トウキョウ",
        pronunciation: "トーキョー",
        partOfSpeech: {
          level1: "名詞",
          level2: "固有名詞",
          level3: "地名",
        },
        accent: {
          accentType: "0",
        },
      },
    ]);

    const adapted = adaptUniDicTokensToAccentIR({
      locale: "ja-JP",
      tokens: overriddenTokens,
      azureHintMode: "explicit-only",
      azurePhonemeMode: {
        alphabet: "ipa",
        unit: "contentPlusParticles",
      },
    });
    const emitted = emitAzureSSML(adapted.accentIR, {
      locale: "ja-JP",
      voice: "ja-JP-NanamiNeural",
      azureReadingFallback: "plainText",
    });

    expect(adapted.warnings).toEqual([]);
    expect(emitted.warnings).toEqual([]);
    expect(emitted.ssml).toBe(
      wrapAzureSSML('<phoneme alphabet="ipa" ph="toː.kjoː">東京</phoneme>')
    );
  });

  it("句の束ね後も ipa mode では 1 phoneme span にまとまる", () => {
    const overriddenTokens = applyTokenOverrides([
      {
        surface: "残っ",
        reading: "ノコッ",
        pronunciation: "ノコッ",
        lemma: "残る",
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
      },
      {
        surface: "て",
        reading: "テ",
        pronunciation: "テ",
        partOfSpeech: {
          level1: "助詞",
          level2: "接続助詞",
        },
      },
      {
        surface: "い",
        reading: "イ",
        pronunciation: "イ",
        lemma: "居る",
        partOfSpeech: {
          level1: "動詞",
          level2: "非自立可能",
        },
      },
      {
        surface: "まし",
        reading: "マシ",
        pronunciation: "マシ",
        partOfSpeech: {
          level1: "助動詞",
        },
      },
      {
        surface: "た",
        reading: "タ",
        pronunciation: "タ",
        partOfSpeech: {
          level1: "助動詞",
        },
      },
    ]);

    const adapted = adaptUniDicTokensToAccentIR({
      locale: "ja-JP",
      tokens: overriddenTokens,
      azureHintMode: "explicit-only",
      azurePhonemeMode: {
        alphabet: "ipa",
        unit: "contentPlusParticles",
      },
    });
    const emitted = emitAzureSSML(adapted.accentIR, {
      locale: "ja-JP",
      voice: "ja-JP-NanamiNeural",
      azureReadingFallback: "plainText",
    });

    expect(adapted.warnings).toEqual([]);
    expect(emitted.warnings).toEqual([]);
    expect(emitted.ssml).toBe(
      wrapAzureSSML(
        '<phoneme alphabet="ipa" ph="no.ko.tte.i.ma.ɕi.ta">残っていました</phoneme>'
      )
    );
  });
});
