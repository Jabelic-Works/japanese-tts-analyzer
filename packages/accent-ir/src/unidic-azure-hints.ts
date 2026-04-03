import type { AccentIRTextSegment, JapanesePitchAccent } from "./index";
import { splitKanaIntoMoras, toKatakana } from "./kana";
import type { UniDicRawToken } from "./unidic-contract";

export interface AzurePhonemeHint {
  alphabet: "sapi" | "ipa";
  value: string;
}

// MVP only. This is a lightweight heuristic that derives Azure SAPI-style
// pronunciation hints from normalized UniDic token data. It is not intended to
// be a complete or linguistically perfect converter.

export const buildAzurePhonemeHintFromUniDicToken = (
  token: UniDicRawToken
): AzurePhonemeHint | undefined => {
  const pronunciation = normalizeToKatakana(
    token.pronunciation ?? token.reading ?? undefined
  );

  if (!pronunciation) {
    return undefined;
  }

  return {
    alphabet: "sapi",
    value: applyAccentMarkers(pronunciation, token.accent?.accentType),
  };
};

export const buildAzureIpaPhonemeHintFromUniDicTokens = (
  tokens: readonly UniDicRawToken[],
  accent?: JapanesePitchAccent
): AzurePhonemeHint | undefined => {
  const pronunciation = tokens
    .map((token) => normalizeToKatakana(token.pronunciation ?? token.reading ?? undefined))
    .filter((value): value is string => Boolean(value))
    .join("");

  if (!pronunciation) {
    return undefined;
  }

  const ipa = convertKatakanaToAzureIpa(pronunciation, accent);
  if (!ipa) {
    return undefined;
  }

  return {
    alphabet: "ipa",
    value: ipa,
  };
};

export const buildAzurePhonemeHintFromUniDicTokens = (
  tokens: readonly UniDicRawToken[]
): AzurePhonemeHint | undefined => {
  const values = tokens
    .map((token) => buildAzurePhonemeHintFromUniDicToken(token)?.value)
    .filter((value): value is string => Boolean(value));

  if (values.length === 0) {
    return undefined;
  }

  return {
    alphabet: "sapi",
    value: values.join(""),
  };
};

export const appendAzureHintToSegment = (
  segment: AccentIRTextSegment,
  token: UniDicRawToken
): void => {
  const tokenHint = buildAzurePhonemeHintFromUniDicToken(token);
  if (!tokenHint) {
    return;
  }

  const existingValue = segment.hints?.azurePhoneme?.value;

  segment.hints = {
    ...segment.hints,
    azurePhoneme: {
      alphabet: "sapi",
      value: `${existingValue ?? ""}${tokenHint.value}`,
    },
  };
};

const applyAccentMarkers = (
  katakana: string,
  accentType?: string | null
): string => {
  const normalizedAccentType = accentType?.trim();

  if (!normalizedAccentType || normalizedAccentType === "*") {
    return katakana;
  }

  const moras = splitKanaIntoMoras(katakana);
  if (moras.length === 0) {
    return katakana;
  }

  if (normalizedAccentType === "0") {
    return `${moras.join("")}+`;
  }

  const accentIndex = Number.parseInt(normalizedAccentType, 10);
  if (Number.isNaN(accentIndex)) {
    return katakana;
  }

  if (accentIndex < 1 || accentIndex > moras.length) {
    return katakana;
  }

  const beforeAccent = moras.slice(0, accentIndex).join("");
  const afterAccent = moras.slice(accentIndex).join("");
  return `${beforeAccent}'${afterAccent}`;
};

const PROLONGED_SOUND_MARK = "ー";

const KATAKANA_MORA_TO_IPA: Record<string, string> = {
  ア: "a",
  イ: "i",
  ウ: "ɯ",
  エ: "e",
  オ: "o",
  カ: "ka",
  キ: "ki",
  ク: "kɯ",
  ケ: "ke",
  コ: "ko",
  サ: "sa",
  シ: "ɕi",
  ス: "sɯ",
  セ: "se",
  ソ: "so",
  タ: "ta",
  チ: "tɕi",
  ツ: "tsɯ",
  テ: "te",
  ト: "to",
  ナ: "na",
  ニ: "ni",
  ヌ: "nɯ",
  ネ: "ne",
  ノ: "no",
  ハ: "ha",
  ヒ: "çi",
  フ: "ɸɯ",
  ヘ: "he",
  ホ: "ho",
  マ: "ma",
  ミ: "mi",
  ム: "mɯ",
  メ: "me",
  モ: "mo",
  ヤ: "ja",
  ユ: "jɯ",
  ヨ: "jo",
  ラ: "ɾa",
  リ: "ɾi",
  ル: "ɾɯ",
  レ: "ɾe",
  ロ: "ɾo",
  ワ: "wa",
  ヲ: "o",
  ン: "ɴ",
  ガ: "ga",
  ギ: "gi",
  グ: "gɯ",
  ゲ: "ge",
  ゴ: "go",
  ザ: "za",
  ジ: "dʑi",
  ズ: "zɯ",
  ゼ: "ze",
  ゾ: "zo",
  ダ: "da",
  ヂ: "dʑi",
  ヅ: "zɯ",
  デ: "de",
  ド: "do",
  バ: "ba",
  ビ: "bi",
  ブ: "bɯ",
  ベ: "be",
  ボ: "bo",
  パ: "pa",
  ピ: "pi",
  プ: "pɯ",
  ペ: "pe",
  ポ: "po",
  キャ: "kja",
  キュ: "kjɯ",
  キョ: "kjo",
  シャ: "ɕa",
  シュ: "ɕɯ",
  ショ: "ɕo",
  チャ: "tɕa",
  チュ: "tɕɯ",
  チョ: "tɕo",
  ニャ: "nja",
  ニュ: "njɯ",
  ニョ: "njo",
  ヒャ: "ça",
  ヒュ: "çɯ",
  ヒョ: "ço",
  ミャ: "mja",
  ミュ: "mjɯ",
  ミョ: "mjo",
  リャ: "ɾja",
  リュ: "ɾjɯ",
  リョ: "ɾjo",
  ギャ: "gja",
  ギュ: "gjɯ",
  ギョ: "gjo",
  ジャ: "dʑa",
  ジュ: "dʑɯ",
  ジョ: "dʑo",
  ヂャ: "dʑa",
  ヂュ: "dʑɯ",
  ヂョ: "dʑo",
  ビャ: "bja",
  ビュ: "bjɯ",
  ビョ: "bjo",
  ピャ: "pja",
  ピュ: "pjɯ",
  ピョ: "pjo",
  ヴァ: "va",
  ヴィ: "vi",
  ヴ: "vɯ",
  ヴェ: "ve",
  ヴォ: "vo",
};

const convertKatakanaToAzureIpa = (
  katakana: string,
  accent?: JapanesePitchAccent
): string | undefined => {
  const moras = splitKanaIntoMoras(katakana);
  if (moras.length === 0) {
    return undefined;
  }

  const syllables: string[] = [];
  let pendingGeminate = "";

  for (const [index, mora] of moras.entries()) {
    if (mora === "ッ") {
      pendingGeminate = resolveGeminatePrefix(moras[index + 1]);
      continue;
    }

    const syllable = convertMoraToIpa(mora);
    if (!syllable) {
      return undefined;
    }

    syllables.push(`${pendingGeminate}${syllable}`);
    pendingGeminate = "";
  }

  const stressIndex = resolveStressIndex(accent, syllables.length);

  return syllables
    .map((syllable, index) =>
      index === stressIndex ? `ˈ${syllable}` : syllable
    )
    .join(".");
};

const convertMoraToIpa = (mora: string): string | undefined => {
  let normalized = mora;
  let longMarks = 0;

  while (normalized.endsWith(PROLONGED_SOUND_MARK)) {
    normalized = normalized.slice(0, -1);
    longMarks += 1;
  }

  const base = KATAKANA_MORA_TO_IPA[normalized];
  if (!base) {
    return undefined;
  }

  let result = base;
  for (let index = 0; index < longMarks; index += 1) {
    result = lengthenFinalVowel(result);
  }

  return result;
};

const lengthenFinalVowel = (value: string): string =>
  value.replace(/[aeiouɯ]$/u, "$&ː");

const resolveGeminatePrefix = (nextMora?: string): string => {
  if (!nextMora) {
    return "";
  }

  const nextIpa = convertMoraToIpa(nextMora);
  if (!nextIpa) {
    return "";
  }

  if (nextIpa.startsWith("tɕ") || nextIpa.startsWith("ts")) {
    return "t";
  }

  if (nextIpa.startsWith("dʑ")) {
    return "d";
  }

  const match = nextIpa.match(/^(ɕ|ç|ɸ|[kgsztdnhbmpɾjvwr])/u);
  return match?.[0] ?? "";
};

const resolveStressIndex = (
  accent: JapanesePitchAccent | undefined,
  syllableCount: number
): number | undefined => {
  const downstep = accent?.downstep;

  if (downstep === null || downstep === undefined) {
    return undefined;
  }

  if (downstep < 1 || downstep > syllableCount) {
    return undefined;
  }

  return downstep - 1;
};

const normalizeToKatakana = (value?: string): string | undefined => {
  if (!value || value === "*") {
    return undefined;
  }

  return toKatakana(value);
};
