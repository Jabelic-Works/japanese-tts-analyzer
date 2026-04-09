import { describe, expect, it } from "vitest";
import { parseUniDic22Output } from "../mecab.js";

describe("MeCab parser", () => {
  it("空白 surface を trim せず保持する", () => {
    const output = [
      "Azure\t名詞,普通名詞,一般,*,*,*,Azure,Azure,Azure,Azure",
      " \t補助記号,空白,*,*,*,*,*,*,*,*",
      "Speech\t名詞,普通名詞,一般,*,*,*,Speech,Speech,Speech,Speech",
      "EOS",
    ].join("\n");

    expect(parseUniDic22Output(output)).toEqual([
      {
        surface: "Azure",
        lemma: "Azure",
        orthBase: undefined,
        reading: "Azure",
        pronunciation: "Azure",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
          level4: undefined,
        },
        inflection: undefined,
        accent: undefined,
        source: {
          dictionary: "unidic",
          rawFeatures: [
            "名詞",
            "普通名詞",
            "一般",
            "*",
            "*",
            "*",
            "Azure",
            "Azure",
            "Azure",
            "Azure",
          ],
        },
      },
      {
        surface: " ",
        lemma: undefined,
        orthBase: undefined,
        reading: undefined,
        pronunciation: undefined,
        partOfSpeech: {
          level1: "補助記号",
          level2: "空白",
          level3: undefined,
          level4: undefined,
        },
        inflection: undefined,
        accent: undefined,
        source: {
          dictionary: "unidic",
          rawFeatures: [
            "補助記号",
            "空白",
            "*",
            "*",
            "*",
            "*",
            "*",
            "*",
            "*",
            "*",
          ],
        },
      },
      {
        surface: "Speech",
        lemma: "Speech",
        orthBase: undefined,
        reading: "Speech",
        pronunciation: "Speech",
        partOfSpeech: {
          level1: "名詞",
          level2: "普通名詞",
          level3: "一般",
          level4: undefined,
        },
        inflection: undefined,
        accent: undefined,
        source: {
          dictionary: "unidic",
          rawFeatures: [
            "名詞",
            "普通名詞",
            "一般",
            "*",
            "*",
            "*",
            "Speech",
            "Speech",
            "Speech",
            "Speech",
          ],
        },
      },
    ]);
  });
});
