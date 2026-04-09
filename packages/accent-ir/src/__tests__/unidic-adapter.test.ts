import { describe, expect, it } from "vitest";
import { adaptUniDicTokensToAccentIR } from "../unidic-adapter";
import type { UniDicRawToken } from "../unidic-contract";

describe("UniDic adapter", () => {
  it("名詞 token を AccentIR の text segment に変換する", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "箸",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "1",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.warnings).toEqual([]);
    expect(result.accentIR).toEqual({
      locale: "ja-JP",
      segments: [
        {
          type: "text",
          text: "箸",
          reading: "はし",
          accent: { downstep: 1 },
          hints: {
            azurePhoneme: {
              alphabet: "sapi",
              value: "ハ'シ",
            },
          },
        },
      ],
    });
  });

  it("固有名詞 token も MVP 範囲として扱う", () => {
    const tokens: UniDicRawToken[] = [
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
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.warnings).toEqual([]);
    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "東京",
        reading: "とうきょう",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "トーキョー+",
          },
        },
      },
    ]);
  });

  it("助詞を前の text segment に連結する", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "箸",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "1",
        },
      },
      {
        surface: "を",
        reading: "ヲ",
        pronunciation: "オ",
        partOfSpeech: {
          level1: "助詞",
          level2: "格助詞",
        },
      },
      {
        surface: "持つ",
        reading: "モツ",
        pronunciation: "モツ",
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
        accent: {
          accentType: "1",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "箸を",
        reading: "はしを",
        accent: { downstep: 1 },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ハ'シオ",
          },
        },
      },
      {
        type: "text",
        text: "持つ",
        reading: "もつ",
        accent: { downstep: 1 },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "モ'ツ",
          },
        },
      },
    ]);
  });

  it("助動詞を前の text segment に連結する", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "印象",
        reading: "インショウ",
        pronunciation: "インショー",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "0",
        },
      },
      {
        surface: "です",
        reading: "デス",
        pronunciation: "デス",
        partOfSpeech: {
          level1: "助動詞",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "印象です",
        reading: "いんしょうです",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "インショー+デス",
          },
        },
      },
    ]);
  });

  it("接続助詞の が は前の text segment に連結する", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "印象",
        reading: "インショウ",
        pronunciation: "インショー",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "0",
        },
      },
      {
        surface: "です",
        reading: "デス",
        pronunciation: "デス",
        partOfSpeech: {
          level1: "助動詞",
        },
      },
      {
        surface: "が",
        reading: "ガ",
        pronunciation: "ガ",
        partOfSpeech: {
          level1: "助詞",
          level2: "接続助詞",
        },
      },
      {
        surface: "変わる",
        reading: "カワル",
        pronunciation: "カワル",
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
        accent: {
          accentType: "0",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "印象ですが",
        reading: "いんしょうですが",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "インショー+デスガ",
          },
        },
      },
      {
        type: "text",
        text: "変わる",
        reading: "かわる",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "カワル+",
          },
        },
      },
    ]);
  });

  it("接続助詞の けれど は前の text segment に連結する", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "印象",
        reading: "インショウ",
        pronunciation: "インショー",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "0",
        },
      },
      {
        surface: "です",
        reading: "デス",
        pronunciation: "デス",
        partOfSpeech: {
          level1: "助動詞",
        },
      },
      {
        surface: "けれど",
        reading: "ケレド",
        pronunciation: "ケレド",
        partOfSpeech: {
          level1: "助詞",
          level2: "接続助詞",
        },
      },
      {
        surface: "変わる",
        reading: "カワル",
        pronunciation: "カワル",
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
        accent: {
          accentType: "0",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "印象ですけれど",
        reading: "いんしょうですけれど",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "インショー+デスケレド",
          },
        },
      },
      {
        type: "text",
        text: "変わる",
        reading: "かわる",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "カワル+",
          },
        },
      },
    ]);
  });

  it("けれど の後ろの も も同じ text segment に連結する", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "印象",
        reading: "インショウ",
        pronunciation: "インショー",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "0",
        },
      },
      {
        surface: "です",
        reading: "デス",
        pronunciation: "デス",
        partOfSpeech: {
          level1: "助動詞",
        },
      },
      {
        surface: "けれど",
        reading: "ケレド",
        pronunciation: "ケレド",
        partOfSpeech: {
          level1: "助詞",
          level2: "接続助詞",
        },
      },
      {
        surface: "も",
        reading: "モ",
        pronunciation: "モ",
        partOfSpeech: {
          level1: "助詞",
          level2: "係助詞",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "印象ですけれども",
        reading: "いんしょうですけれども",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "インショー+デスケレドモ",
          },
        },
      },
    ]);
  });

  it("ipa mode では助詞連結後の segment から ipa hint を組み立てる", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "箸",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "1",
        },
      },
      {
        surface: "を",
        reading: "ヲ",
        pronunciation: "オ",
        partOfSpeech: {
          level1: "助詞",
          level2: "格助詞",
        },
      },
      {
        surface: "持つ",
        reading: "モツ",
        pronunciation: "モツ",
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
        accent: {
          accentType: "1",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({
      tokens,
      azurePhonemeMode: {
        alphabet: "ipa",
        unit: "contentPlusParticles",
      },
    });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "箸を",
        reading: "はしを",
        accent: { downstep: 1 },
        hints: {
          azurePhoneme: {
            alphabet: "ipa",
            value: "ˈha.ɕi.o",
          },
        },
      },
      {
        type: "text",
        text: "持つ",
        reading: "もつ",
        accent: { downstep: 1 },
        hints: {
          azurePhoneme: {
            alphabet: "ipa",
            value: "ˈmo.tsɯ",
          },
        },
      },
    ]);
  });

  it("自動生成した azurePhoneme が ん で終わる場合は trailing alias を付ける", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "閉館時間",
        reading: "ヘイカンジカン",
        pronunciation: "ヘイカンジカン",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "閉館時間",
        reading: "へいかんじかん",
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ヘイカンジカン",
          },
          azureTrailingSubAlias: "ん",
        },
      },
    ]);
  });

  it("ipa mode でも ん 末尾には trailing alias を付ける", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "閉館時間",
        reading: "ヘイカンジカン",
        pronunciation: "ヘイカンジカン",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({
      tokens,
      azurePhonemeMode: {
        alphabet: "ipa",
        unit: "contentPlusParticles",
      },
    });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "閉館時間",
        reading: "へいかんじかん",
        hints: {
          azurePhoneme: {
            alphabet: "ipa",
            value: "he.i.ka.ɴ.dʑi.ka.ɴ",
          },
          azureTrailingSubAlias: "ん",
        },
      },
    ]);
  });

  it("自動 trailing alias が付いた token には助詞を連結しない", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "発音",
        reading: "ハツオン",
        pronunciation: "ハツオン",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
      },
      {
        surface: "を",
        reading: "ヲ",
        pronunciation: "オ",
        partOfSpeech: {
          level1: "助詞",
          level2: "格助詞",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "発音",
        reading: "はつおん",
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ハツオン",
          },
          azureTrailingSubAlias: "ん",
        },
      },
      {
        type: "text",
        text: "を",
        reading: "を",
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "オ",
          },
        },
      },
    ]);
  });

  it("azureTrailingSubAlias hint がある token には助詞を連結しない", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "要件",
        reading: "ヨウケン",
        pronunciation: "ヨ+ウケ'ン",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "3,0",
        },
        ttsHints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ヨ+++ウケ'",
          },
          azureTrailingSubAlias: "ン",
        },
      },
      {
        surface: "を",
        reading: "ヲ",
        pronunciation: "オ",
        partOfSpeech: {
          level1: "助詞",
          level2: "格助詞",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({
      tokens,
      azureHintMode: "explicit-only",
    });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "要件",
        reading: "ようけん",
        accent: { downstep: 3 },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ヨ+++ウケ'",
          },
          azureTrailingSubAlias: "ん",
        },
      },
      {
        type: "text",
        text: "を",
        reading: "を",
      },
    ]);
  });

  it("preventParticleMerge hint がある token には助詞を連結しない", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "要項",
        reading: "ヨウコウ",
        pronunciation: "ヨーコー",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "0",
        },
        ttsHints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ヨゥコ++ウ",
          },
          preventParticleMerge: true,
        },
      },
      {
        surface: "を",
        reading: "ヲ",
        pronunciation: "オ",
        partOfSpeech: {
          level1: "助詞",
          level2: "格助詞",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({
      tokens,
      azureHintMode: "explicit-only",
    });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "要項",
        reading: "ようこう",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ヨゥコ++ウ",
          },
          preventParticleMerge: true,
        },
      },
      {
        type: "text",
        text: "を",
        reading: "を",
      },
    ]);
  });

  it("ipa mode でも explicit Azure hint がある segment は上書きしない", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "要件",
        reading: "ヨウケン",
        pronunciation: "ヨ+ウケ'ン",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "3,0",
        },
        ttsHints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ヨ+++ウケ'",
          },
          azureTrailingSubAlias: "ン",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({
      tokens,
      azurePhonemeMode: {
        alphabet: "ipa",
        unit: "contentPlusParticles",
      },
    });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "要件",
        reading: "ようけん",
        accent: { downstep: 3 },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ヨ+++ウケ'",
          },
          azureTrailingSubAlias: "ん",
        },
      },
    ]);
  });

  it("主格の「が」は前の text segment に連結しない", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "印象",
        reading: "インショウ",
        pronunciation: "インショー",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "0",
        },
      },
      {
        surface: "が",
        reading: "ガ",
        pronunciation: "ガ",
        partOfSpeech: {
          level1: "助詞",
          level2: "格助詞",
        },
      },
      {
        surface: "変わる",
        reading: "カワル",
        pronunciation: "カワル",
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
        accent: {
          accentType: "0",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "印象",
        reading: "いんしょう",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "インショー+",
          },
        },
      },
      {
        type: "text",
        text: "が",
        reading: "が",
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ガ",
          },
        },
      },
      {
        type: "text",
        text: "変わる",
        reading: "かわる",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "カワル+",
          },
        },
      },
    ]);
  });

  it("読点を text segment として保持する", () => {
    const tokens: UniDicRawToken[] = [
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
      {
        surface: "、",
        partOfSpeech: {
          level1: "補助記号",
          level2: "読点",
        },
      },
      {
        surface: "橋",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "2",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "東京",
        reading: "とうきょう",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "トーキョー+",
          },
        },
      },
      {
        type: "text",
        text: "、",
      },
      {
        type: "text",
        text: "橋",
        reading: "はし",
        accent: { downstep: 2 },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ハシ'",
          },
        },
      },
    ]);
  });

  it("文中の句点を text segment として保持する", () => {
    const tokens: UniDicRawToken[] = [
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
      {
        surface: "。",
        partOfSpeech: {
          level1: "補助記号",
          level2: "句点",
        },
      },
      {
        surface: "橋",
        reading: "ハシ",
        pronunciation: "ハシ",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
        },
        accent: {
          accentType: "2",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "東京",
        reading: "とうきょう",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "トーキョー+",
          },
        },
      },
      {
        type: "text",
        text: "。",
      },
      {
        type: "text",
        text: "橋",
        reading: "はし",
        accent: { downstep: 2 },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "ハシ'",
          },
        },
      },
    ]);
  });

  it("文末の句点を text segment として保持する", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "持つ",
        reading: "モツ",
        pronunciation: "モツ",
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
        accent: {
          accentType: "1",
        },
      },
      {
        surface: "。",
        partOfSpeech: {
          level1: "補助記号",
          level2: "句点",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({ tokens });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "持つ",
        reading: "もつ",
        accent: { downstep: 1 },
        hints: {
          azurePhoneme: {
            alphabet: "sapi",
            value: "モ'ツ",
          },
        },
      },
      {
        type: "text",
        text: "。",
      },
    ]);
  });

  it("explicit-only モードでは Azure hint を自動付与しない", () => {
    const tokens: UniDicRawToken[] = [
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
    ];

    const result = adaptUniDicTokensToAccentIR({
      tokens,
      azureHintMode: "explicit-only",
    });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "東京",
        reading: "とうきょう",
        accent: { downstep: null },
      },
    ]);
  });

  it("explicit-only モードでも ipa mode は segment 単位で適用する", () => {
    const tokens: UniDicRawToken[] = [
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
    ];

    const result = adaptUniDicTokensToAccentIR({
      tokens,
      azureHintMode: "explicit-only",
      azurePhonemeMode: {
        alphabet: "ipa",
        unit: "contentPlusParticles",
      },
    });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "東京",
        reading: "とうきょう",
        accent: { downstep: null },
        hints: {
          azurePhoneme: {
            alphabet: "ipa",
            value: "toː.kjoː",
          },
        },
      },
    ]);
  });

  it("explicit hint があれば explicit-only モードでも Azure sub alias を保持する", () => {
    const tokens: UniDicRawToken[] = [
      {
        surface: "9時",
        reading: "クジ",
        pronunciation: "クジ'",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
        },
        ttsHints: {
          azureSubAlias: "クジ",
        },
      },
    ];

    const result = adaptUniDicTokensToAccentIR({
      tokens,
      azureHintMode: "explicit-only",
    });

    expect(result.accentIR.segments).toEqual([
      {
        type: "text",
        text: "9時",
        reading: "くじ",
        hints: {
          azureSubAlias: "くじ",
        },
      },
    ]);
  });
});
