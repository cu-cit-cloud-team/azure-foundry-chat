import { atomWithStorage } from 'jotai/utils';

import type { UserMeta } from '@/app/types';
import {
  DEFAULT_MAX_INPUT_TOKENS,
  DEFAULT_MODEL_NAME,
  models,
} from '@/app/utils/models';

const defaultModel = models.find((m) => m.default);

export const themeAtom = atomWithStorage('theme', 'dark');

export const systemMessageAtom = atomWithStorage(
  'systemMessage',
  'You are a helpful AI assistant.'
);

export const systemMessageMaxTokens = 4096;

export const modelAtom = atomWithStorage(
  'model',
  defaultModel?.name || DEFAULT_MODEL_NAME
);

// get tokens for default model
const tokensRemaining = defaultModel?.maxInputTokens || DEFAULT_MAX_INPUT_TOKENS;

export const tokensAtom = atomWithStorage('tokens', {
  input: 0,
  maximum: tokensRemaining,
  remaining: tokensRemaining,
  systemMessage: 0,
  systemMessageRemaining: systemMessageMaxTokens,
});

export const userMetaAtom = atomWithStorage<UserMeta>('userMeta', {});

export const isLoadingAtom = atomWithStorage('isLoading', false);
