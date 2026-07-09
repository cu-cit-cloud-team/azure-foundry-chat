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
    displayName: 'GPT 5.4',
    modelVersion: '2026-03-05',
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    name: 'gpt-5.4',
    provider: 'openai',
    capabilities: ['tools', 'web-search'],
  },
  {
    displayName: 'GPT 5.4 Mini',
    modelVersion: '2026-03-17',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5.4-mini',
    provider: 'openai',
    capabilities: ['tools', 'web-search'],
  },
  {
    displayName: 'GPT 5.4 Nano',
    modelVersion: '2026-03-17',
    maxInputTokens: 272000,
    maxOutputTokens: 128000,
    name: 'gpt-5.4-nano',
    provider: 'openai',
    capabilities: ['tools', 'web-search'],
  },
  {
    displayName: 'GPT 5.4 Pro',
    modelVersion: '2026-03-05',
    maxInputTokens: 200000,
    maxOutputTokens: 100000,
    name: 'gpt-5.4-pro',
    provider: 'openai',
    capabilities: ['tools', 'web-search', 'reasoning'],
  },
  {
    displayName: 'GPT 5.5',
    modelVersion: '2026-04-24',
    maxInputTokens: 1050000,
    maxOutputTokens: 100000,
    name: 'gpt-5.5',
    provider: 'openai',
    capabilities: ['tools', 'web-search', 'reasoning'],
  },
  {
    displayName: 'GPT Chat Latest (GPT 5.5 Instant)',
    modelVersion: '2026-06-24',
    maxInputTokens: 200000,
    maxOutputTokens: 128000,
    name: 'gpt-chat-latest',
    provider: 'openai',
    capabilities: ['tools', 'web-search', 'reasoning'],
  },
  {
    displayName: 'GPT 5.6 Luna',
    modelVersion: '2026-07-09',
    maxInputTokens: 256000,
    maxOutputTokens: 128000,
    name: 'gpt-5.6-luna',
    provider: 'openai',
    capabilities: ['tools', 'web-search', 'reasoning'],
  },
  {
    displayName: 'GPT 5.6 Sol',
    modelVersion: '2026-07-09',
    maxInputTokens: 256000,
    maxOutputTokens: 128000,
    name: 'gpt-5.6-sol',
    provider: 'openai',
    capabilities: ['tools', 'web-search', 'reasoning'],
  },
  {
    displayName: 'GPT 5.6 Terra',
    modelVersion: '2026-07-09',
    maxInputTokens: 256000,
    maxOutputTokens: 128000,
    name: 'gpt-5.6-terra',
    provider: 'openai',
    capabilities: ['tools', 'web-search', 'reasoning'],
  },
  {
    displayName: 'Claude Haiku 4.5',
    modelVersion: '2',
    maxInputTokens: 136000,
    maxOutputTokens: 64000,
    name: 'claude-haiku-4-5',
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
    displayName: 'Claude Opus 4.7',
    modelVersion: '1',
    maxInputTokens: 1000000,
    maxOutputTokens: 128000,
    name: 'claude-opus-4-7',
    provider: 'anthropic',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Claude Opus 4.8',
    modelVersion: '2',
    maxInputTokens: 1000000,
    maxOutputTokens: 128000,
    name: 'claude-opus-4-8',
    provider: 'anthropic',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Claude Sonnet 5',
    modelVersion: '2',
    maxInputTokens: 128000,
    maxOutputTokens: 128000,
    name: 'claude-sonnet-5',
    provider: 'anthropic',
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
    displayName: 'DeepSeek V4 Flash',
    modelVersion: '2026-04-23',
    maxInputTokens: 128000,
    maxOutputTokens: 128000,
    name: 'DeepSeek-V4-Flash',
    provider: 'deepseek',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'DeepSeek V4 Pro',
    modelVersion: '2026-04-23',
    maxInputTokens: 128000,
    maxOutputTokens: 128000,
    name: 'DeepSeek-V4-Pro',
    provider: 'deepseek',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Grok 4.2 Non-Reasoning',
    modelVersion: '1',
    maxInputTokens: 262144,
    maxOutputTokens: 8192,
    name: 'grok-4-20-non-reasoning',
    provider: 'xai',
    capabilities: ['tools'],
  },
  {
    displayName: 'Grok 4.2 Reasoning',
    modelVersion: '1',
    maxInputTokens: 262144,
    maxOutputTokens: 8192,
    name: 'grok-4-20-reasoning',
    provider: 'xai',
    capabilities: ['tools', 'reasoning'],
  },
  {
    displayName: 'Grok 4.3',
    modelVersion: '1',
    maxInputTokens: 262144,
    maxOutputTokens: 8192,
    name: 'grok-4.3',
    provider: 'xai',
    capabilities: ['tools', 'reasoning'],
  },
];

// constants to use as fallbacks when no model is found
export const DEFAULT_MODEL_NAME = 'gpt-chat-latest';
export const DEFAULT_MAX_INPUT_TOKENS = 272000;
export const DEFAULT_MAX_OUTPUT_TOKENS = 128000;

export const defaultModel = models.find((model) => model.default);

export const modelStringFromName = (name: string | null | undefined): string => {
  if (!name) {
    return defaultModel?.displayName || 'Unknown Model';
  }

  const model = models.find((model) => model.name === name);
  return model?.displayName || defaultModel?.displayName || 'Unknown Model';
};

export const modelFromName = (name: string): Model | undefined =>
  models.find((model) => model.name === name) || defaultModel;
