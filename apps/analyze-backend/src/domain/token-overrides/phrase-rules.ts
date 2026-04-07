import type { UniDicRawToken } from "@japanese-tts-analyzer/accent-ir";
import type { TokenOverrideMatch } from "./types.js";
import { createSyntheticToken, normalizeKanaReading } from "./utils.js";

const isConnectiveParticle = (token?: UniDicRawToken): token is UniDicRawToken =>
  Boolean(
    token &&
      token.partOfSpeech.level1 === "助詞" &&
      token.partOfSpeech.level2 === "接続助詞" &&
      (token.surface === "て" || token.surface === "で")
  );

const isIruVerb = (token?: UniDicRawToken): token is UniDicRawToken =>
  Boolean(
    token &&
      token.partOfSpeech.level1 === "動詞" &&
      (token.lemma === "居る" || token.lemma === "いる" || token.surface === "い")
  );

const isThinkingVerb = (token?: UniDicRawToken): token is UniDicRawToken =>
  Boolean(token && token.partOfSpeech.level1 === "動詞" && token.lemma === "思う");

const isNaiAdjective = (token?: UniDicRawToken): token is UniDicRawToken =>
  Boolean(
    token &&
      token.partOfSpeech.level1 === "形容詞" &&
      token.surface === "ない"
  );

const isYouStem = (token?: UniDicRawToken): token is UniDicRawToken =>
  Boolean(
    token &&
      token.partOfSpeech.level1 === "形状詞" &&
      token.partOfSpeech.level2 === "助動詞語幹" &&
      token.surface === "よう"
  );

const isNoParticle = (token?: UniDicRawToken): token is UniDicRawToken =>
  Boolean(token && token.partOfSpeech.level1 === "助詞" && token.surface === "の");

const isDeClauseEnding = (token?: UniDicRawToken): token is UniDicRawToken =>
  Boolean(
    token &&
      token.surface === "で" &&
      (token.partOfSpeech.level1 === "助動詞" ||
        token.partOfSpeech.level1 === "助詞")
  );

export const matchSahenVerbExpression = (
  tokens: readonly UniDicRawToken[],
  index: number
): TokenOverrideMatch | undefined => {
  const nounToken = tokens[index];
  const verbToken = tokens[index + 1];

  if (
    !nounToken ||
    !verbToken ||
    nounToken.partOfSpeech.level1 !== "名詞" ||
    nounToken.partOfSpeech.level2 !== "普通名詞" ||
    nounToken.partOfSpeech.level3 !== "サ変可能" ||
    verbToken.lemma !== "為る"
  ) {
    return undefined;
  }

  const sourceTokens = [nounToken, verbToken];
  let nextIndex = index + 2;

  while (tokens[nextIndex]?.partOfSpeech.level1 === "助動詞") {
    sourceTokens.push(tokens[nextIndex]!);
    nextIndex += 1;
  }

  return {
    tokens: [
      createSyntheticToken({
        surface: sourceTokens.map((token) => token.surface).join(""),
        reading: sourceTokens
          .map((token) => normalizeKanaReading(token.reading) ?? token.surface)
          .join(""),
        pronunciation: sourceTokens
          .map((token) => token.pronunciation ?? token.reading ?? token.surface)
          .join(""),
        sourceTokens,
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
      }),
    ],
    nextIndex,
  };
};

export const matchTeIruVerbExpression = (
  tokens: readonly UniDicRawToken[],
  index: number
): TokenOverrideMatch | undefined => {
  const verbToken = tokens[index];
  const connectiveToken = tokens[index + 1];
  const iruToken = tokens[index + 2];

  if (
    !verbToken ||
    verbToken.partOfSpeech.level1 !== "動詞" ||
    !isConnectiveParticle(connectiveToken) ||
    !isIruVerb(iruToken)
  ) {
    return undefined;
  }

  const sourceTokens = [verbToken, connectiveToken, iruToken];
  let nextIndex = index + 3;

  while (tokens[nextIndex]?.partOfSpeech.level1 === "助動詞") {
    sourceTokens.push(tokens[nextIndex]!);
    nextIndex += 1;
  }

  return {
    tokens: [
      createSyntheticToken({
        surface: sourceTokens.map((token) => token.surface).join(""),
        reading: sourceTokens
          .map((token) => normalizeKanaReading(token.reading) ?? token.surface)
          .join(""),
        pronunciation: sourceTokens
          .map((token) => token.pronunciation ?? token.reading ?? token.surface)
          .join(""),
        sourceTokens,
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
      }),
    ],
    nextIndex,
  };
};

export const matchToOmouExpression = (
  tokens: readonly UniDicRawToken[],
  index: number
): TokenOverrideMatch | undefined => {
  const quoteToken = tokens[index];
  const verbToken = tokens[index + 1];

  if (
    !quoteToken ||
    quoteToken.partOfSpeech.level1 !== "助詞" ||
    quoteToken.surface !== "と" ||
    !isThinkingVerb(verbToken)
  ) {
    return undefined;
  }

  const sourceTokens = [quoteToken, verbToken];
  let nextIndex = index + 2;

  while (tokens[nextIndex]?.partOfSpeech.level1 === "助動詞") {
    sourceTokens.push(tokens[nextIndex]!);
    nextIndex += 1;
  }

  return {
    tokens: [
      createSyntheticToken({
        surface: sourceTokens.map((token) => token.surface).join(""),
        reading: sourceTokens
          .map((token) => normalizeKanaReading(token.reading) ?? token.surface)
          .join(""),
        pronunciation: sourceTokens
          .map((token) => token.pronunciation ?? token.reading ?? token.surface)
          .join(""),
        sourceTokens,
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
      }),
    ],
    nextIndex,
  };
};

export const matchNaiYouExpression = (
  tokens: readonly UniDicRawToken[],
  index: number
): TokenOverrideMatch | undefined => {
  const naiToken = tokens[index];
  const youToken = tokens[index + 1];

  if (!isNaiAdjective(naiToken) || !isYouStem(youToken)) {
    return undefined;
  }

  return {
    tokens: [
      createSyntheticToken({
        surface: `${naiToken.surface}${youToken.surface}`,
        reading: `${normalizeKanaReading(naiToken.reading) ?? naiToken.surface}${normalizeKanaReading(youToken.reading) ?? youToken.surface}`,
        pronunciation: `${naiToken.pronunciation ?? naiToken.reading ?? naiToken.surface}${youToken.pronunciation ?? youToken.reading ?? youToken.surface}`,
        sourceTokens: [naiToken, youToken],
        partOfSpeech: {
          level1: "形容詞",
          level2: "非自立可能",
        },
      }),
    ],
    nextIndex: index + 2,
  };
};

export const matchNoDeExpression = (
  tokens: readonly UniDicRawToken[],
  index: number
): TokenOverrideMatch | undefined => {
  const verbToken = tokens[index];
  const noToken = tokens[index + 1];
  const deToken = tokens[index + 2];

  if (
    !verbToken ||
    verbToken.partOfSpeech.level1 !== "動詞" ||
    !isNoParticle(noToken) ||
    !isDeClauseEnding(deToken)
  ) {
    return undefined;
  }

  return {
    tokens: [
      createSyntheticToken({
        surface: `${verbToken.surface}${noToken.surface}${deToken.surface}`,
        reading: `${normalizeKanaReading(verbToken.reading) ?? verbToken.surface}${normalizeKanaReading(noToken.reading) ?? noToken.surface}${normalizeKanaReading(deToken.reading) ?? deToken.surface}`,
        pronunciation: `${verbToken.pronunciation ?? verbToken.reading ?? verbToken.surface}${noToken.pronunciation ?? noToken.reading ?? noToken.surface}${deToken.pronunciation ?? deToken.reading ?? deToken.surface}`,
        sourceTokens: [verbToken, noToken, deToken],
        partOfSpeech: {
          level1: "動詞",
          level2: "一般",
        },
      }),
    ],
    nextIndex: index + 3,
  };
};
