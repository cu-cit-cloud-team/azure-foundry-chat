export interface Model {
  default?: boolean;
  displayName: string;
  modelVersion: string;
  maxInputTokens: number;
  maxOutputTokens: number;
  name: string;
  provider: 'openai' | 'anthropic' | 'deepseek' | 'xai';
  providers?: string[];
  capabilities?: ('tools' | 'reasoning' | 'web-search')[];
}

export type Models = Model[];

export const models: Models = [
  {
    displayName: 'GPT 4.1',
    modelVersion: '2025-04-14',
    maxInputTokens: 1047576,
    maxOutputTokens: 32768,
    name: 'gpt-41',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 4.1 Mini',
    modelVersion: '2025-04-14',
    maxInputTokens: 1047576,
    maxOutputTokens: 32768,
    name: 'gpt-41-mini',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 4.1 Nano',
    modelVersion: '2025-04-14',
    maxInputTokens: 1047576,
    maxOutputTokens: 32768,
    name: 'gpt-41-nano',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 5 Mini',
    modelVersion: '2025-08-07',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5-mini',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 5 Nano',
    modelVersion: '2025-08-07',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5-nano',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 5.1',
    modelVersion: '2025-11-13',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5.1',
    default: true,
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 5.1 Chat',
    modelVersion: '2025-11-13',
    maxInputTokens: 111616,
    maxOutputTokens: 16384,
    name: 'gpt-5.1-chat',
    provider: 'openai',
    capabilities: ['tools', 'web-search'],
  },
  {
    displayName: 'GPT 5.1 Codex',
    modelVersion: '2025-11-13',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5.1-codex',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 5.1 Codex Max',
    modelVersion: '2025-12-04',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5.1-codex-max',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 5.1 Codex Mini',
    modelVersion: '2025-11-13',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5.1-codex-mini',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 5.2',
    modelVersion: '2025-12-11',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5.2',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'GPT 5.2 Chat',
    modelVersion: '2025-12-11',
    maxInputTokens: 111616,
    maxOutputTokens: 16384,
    name: 'gpt-5.2-chat',
    provider: 'openai',
    capabilities: ['tools', 'web-search'],
  },
  {
    displayName: 'GPT 5.2 Codex',
    modelVersion: '2025-12-11',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5.2-codex',
    provider: 'openai',
    capabilities: ['tools', 'reasoning', 'web-search'],
  },
  {
    displayName: 'o3',
    modelVersion: '2025-04-16',
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    name: 'o3',
    provider: 'openai',
    capabilities: ['reasoning'],
  },
  {
    displayName: 'o3 Mini',
    modelVersion: '2025-01-31',
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    name: 'o3-mini',
    provider: 'openai',
    capabilities: ['reasoning'],
  },
  {
    displayName: 'o4 Mini',
    modelVersion: '2025-04-16',
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    name: 'o4-mini',
    provider: 'openai',
    capabilities: ['reasoning'],
  },
  {
    displayName: 'Claude Haiku 4.5',
    modelVersion: '2025-10-01',
    maxInputTokens: 136000,
    maxOutputTokens: 64000,
    name: 'claude-haiku-4-5',
    provider: 'anthropic',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Claude Opus 4.5',
    modelVersion: '2025-11-01',
    maxInputTokens: 136000,
    maxOutputTokens: 64000,
    name: 'claude-opus-4-5',
    provider: 'anthropic',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Claude Sonnet 4.5',
    modelVersion: '2025-09-29',
    maxInputTokens: 136000,
    maxOutputTokens: 64000,
    name: 'claude-sonnet-4-5',
    provider: 'anthropic',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Claude Opus 4.6',
    modelVersion: '1',
    maxInputTokens: 136000,
    maxOutputTokens: 64000,
    name: 'claude-opus-4-6',
    provider: 'anthropic',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Claude Sonnet 4.6',
    modelVersion: '1',
    maxInputTokens: 136000,
    maxOutputTokens: 64000,
    name: 'claude-sonnet-4-6',
    provider: 'anthropic',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'DeepSeek V3.1',
    modelVersion: '1',
    maxInputTokens: 131072,
    maxOutputTokens: 131072,
    name: 'DeepSeek-V3.1',
    provider: 'deepseek',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'DeepSeek V3.2',
    modelVersion: '1',
    maxInputTokens: 128000,
    maxOutputTokens: 128000,
    name: 'DeepSeek-V3.2',
    provider: 'deepseek',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'DeepSeek R1-0528',
    modelVersion: '1',
    maxInputTokens: 163840,
    maxOutputTokens: 163840,
    name: 'DeepSeek-R1-0528',
    provider: 'deepseek',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Grok 4',
    modelVersion: '1',
    maxInputTokens: 128000,
    maxOutputTokens: 8192,
    name: 'grok-4',
    provider: 'xai',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Grok Code Fast 1',
    modelVersion: '1',
    maxInputTokens: 128000,
    maxOutputTokens: 128000,
    name: 'grok-code-fast-1',
    provider: 'xai',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Grok 4 Fast Non-Reasoning',
    modelVersion: '1',
    maxInputTokens: 256000,
    maxOutputTokens: 256000,
    name: 'grok-4-fast-non-reasoning',
    provider: 'xai',
    capabilities: ['tools'],
  },
  {
    displayName: 'Grok 4 Fast Reasoning',
    modelVersion: '1',
    maxInputTokens: 256000,
    maxOutputTokens: 256000,
    name: 'grok-4-fast-reasoning',
    provider: 'xai',
    capabilities: ['tools', 'reasoning'],
  },
];

// constants to use as fallbacks when no model is found
export const DEFAULT_MODEL_NAME = 'gpt-5.1';
export const DEFAULT_MAX_INPUT_TOKENS = 272000;
export const DEFAULT_MAX_OUTPUT_TOKENS = 128000;

export const defaultModel = models.find((model) => model.default);

export const modelStringFromName = (
  name: string | null | undefined
): string => {
  if (!name) {
    return defaultModel?.displayName || 'Unknown Model';
  }

  const model = models.find((model) => model.name === name);
  return model?.displayName || defaultModel?.displayName || 'Unknown Model';
};

export const modelFromName = (name: string): Model | undefined =>
  models.find((model) => model.name === name) || defaultModel;
