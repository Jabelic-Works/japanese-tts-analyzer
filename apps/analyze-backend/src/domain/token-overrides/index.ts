import type { UniDicRawToken } from "@japanese-tts-analyzer/accent-ir";
import { matchPhraseOverride, matchSurfaceOverride } from "./lexicon.js";
import {
  matchCurrencyExpression,
  matchDegreeExpression,
  matchGenericNumber,
  matchHourExpression,
  matchMinuteExpression,
  matchPercentExpression,
} from "./numeric-rules.js";
import {
  matchSahenVerbExpression,
  matchToOmouExpression,
  matchTeIruVerbExpression,
} from "./phrase-rules.js";
import type { TokenOverrideMatch } from "./types.js";

const TOKEN_OVERRIDE_RULES = [
  matchPhraseOverride,
  matchSurfaceOverride,
  matchSahenVerbExpression,
  matchTeIruVerbExpression,
  matchToOmouExpression,
  matchHourExpression,
  matchMinuteExpression,
  matchDegreeExpression,
  matchCurrencyExpression,
  matchPercentExpression,
  matchGenericNumber,
] as const;

export const applyTokenOverrides = (
  tokens: readonly UniDicRawToken[]
): UniDicRawToken[] => {
  const nextTokens: UniDicRawToken[] = [];

  for (let index = 0; index < tokens.length; ) {
    const override = TOKEN_OVERRIDE_RULES.reduce<TokenOverrideMatch | undefined>(
      (matched, rule) => matched ?? rule(tokens, index),
      undefined
    );

    if (!override) {
      nextTokens.push(tokens[index]!);
      index += 1;
      continue;
    }

    nextTokens.push(...override.tokens);
    index = override.nextIndex;
  }

  return nextTokens;
};
