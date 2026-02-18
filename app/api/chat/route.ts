import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createMistral } from '@ai-sdk/mistral';
import { createXai } from '@ai-sdk/xai';
import {
  consumeStream,
  convertToModelMessages,
  extractReasoningMiddleware,
  generateId,
  type LanguageModelUsage,
  smoothStream,
  streamText,
  type UIMessage,
  wrapLanguageModel,
} from 'ai';
import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  DEFAULT_MODEL_NAME,
} from '@/app/utils/models';

// Helper to validate required environment variables
function validateEnvVars() {
  const required = {
    AZURE_FOUNDRY_API_KEY,
    AZURE_FOUNDRY_RESOURCE_NAME,
    AZURE_FOUNDRY_ENDPOINT,
    AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT,
    AZURE_OPENAI_GPT51_DEPLOYMENT,
    AZURE_ANTHROPIC_API_PATH,
    AZURE_ANTHROPIC_API_VERSION,
    AZURE_DEEPSEEK_API_PATH,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. Please check your .env.local file.`
    );
  }
}

// Custom message type with usage metadata
type MyMetadata = {
  totalUsage?: LanguageModelUsage;
};

export type MyUIMessage = UIMessage<unknown, MyMetadata>;

// destructure env vars we need
const {
  AZURE_FOUNDRY_API_KEY,
  AZURE_FOUNDRY_ENDPOINT,
  AZURE_FOUNDRY_OPENAI_COMPATIBLE_ENDPOINT,
  AZURE_FOUNDRY_RESOURCE_NAME,
  AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT,
  AZURE_OPENAI_GPT41_DEPLOYMENT,
  AZURE_OPENAI_GPT41_MINI_DEPLOYMENT,
  AZURE_OPENAI_GPT41_NANO_DEPLOYMENT,
  AZURE_OPENAI_GPT5_CHAT_DEPLOYMENT,
  AZURE_OPENAI_GPT5_CODEX_DEPLOYMENT,
  AZURE_OPENAI_GPT5_MINI_DEPLOYMENT,
  AZURE_OPENAI_GPT5_NANO_DEPLOYMENT,
  AZURE_OPENAI_GPT5_DEPLOYMENT,
  AZURE_OPENAI_GPT51_CHAT_DEPLOYMENT,
  AZURE_OPENAI_GPT51_CODEX_DEPLOYMENT,
  AZURE_OPENAI_GPT51_CODEX_MINI_DEPLOYMENT,
  AZURE_OPENAI_GPT51_CODEX_MAX_DEPLOYMENT,
  AZURE_OPENAI_GPT51_DEPLOYMENT,
  AZURE_OPENAI_GPT52_CHAT_DEPLOYMENT,
  AZURE_OPENAI_GPT52_CODEX_DEPLOYMENT,
  AZURE_OPENAI_GPT52_DEPLOYMENT,
  AZURE_OPENAI_O3_DEPLOYMENT,
  AZURE_OPENAI_O3_MINI_DEPLOYMENT,
  AZURE_OPENAI_O4_MINI_DEPLOYMENT,
  AZURE_ANTHROPIC_API_PATH,
  AZURE_ANTHROPIC_API_VERSION,
  AZURE_ANTHROPIC_CLAUDE_HAIKU_45_DEPLOYMENT,
  AZURE_ANTHROPIC_CLAUDE_OPUS_45_DEPLOYMENT,
  AZURE_ANTHROPIC_CLAUDE_SONNET_45_DEPLOYMENT,
  AZURE_ANTHROPIC_CLAUDE_OPUS_46_DEPLOYMENT,
  AZURE_ANTHROPIC_CLAUDE_SONNET_46_DEPLOYMENT,
  AZURE_DEEPSEEK_API_PATH,
  AZURE_DEEPSEEK_R1_0528_DEPLOYMENT,
  AZURE_DEEPSEEK_V31_DEPLOYMENT,
  AZURE_DEEPSEEK_V32_DEPLOYMENT,
  AZURE_MISTRAL_LARGE_3_DEPLOYMENT,
  AZURE_XAI_GROK_4_DEPLOYMENT,
  AZURE_XAI_GROK_4_FAST_NON_REASONING_DEPLOYMENT,
  AZURE_XAI_GROK_4_FAST_REASONING_DEPLOYMENT,
  AZURE_XAI_GROK_CODE_FAST_1_DEPLOYMENT,
} = process.env;

// tell next.js to use the nodejs runtime
export const runtime = 'nodejs';

// force dynamic route (no caching)
export const dynamic = 'force-dynamic';

// set up defaults for chat config
const defaults = {
  systemMessage: 'You are a helpful AI assistant.',
  max_tokens: DEFAULT_MAX_OUTPUT_TOKENS,
  model: DEFAULT_MODEL_NAME, // see utils/models.ts for available models
  user: 'Cloud Team Chat User',
};

// main route handler
export async function POST(req: Request) {
  try {
    // Validate environment variables first
    validateEnvVars();

    // New v5 body contract: messages (UIMessage[]), systemMessage, model
    const {
      messages,
      model: modelName,
      systemMessage: systemMessageRaw,
      webSearch,
    } = await req.json();

    const systemMessage = systemMessageRaw || defaults.systemMessage;
    const model = modelName || defaults.model;
    // const max_tokens = defaults.max_tokens;

    // v5 UIMessage system prompt part
    const systemPrompt = {
      id: `system-${generateId()}`,
      role: 'system',
      parts: [
        {
          type: 'text',
          text: systemMessage,
        },
      ],
    };

    // ensure system prompt included once
    const hasSystemPrompt = messages.some(
      (m: UIMessage) => m.role === 'system'
    );
    const uiMessages = hasSystemPrompt ? messages : [systemPrompt, ...messages];

    // determine if the model supports the images tool
    const useImageTool =
      (model.startsWith('gpt-41') || model.startsWith('gpt-5')) &&
      !model.includes('codex');

    // create azure client
    const azure = createAzure({
      resourceName: AZURE_FOUNDRY_RESOURCE_NAME,
      apiKey: AZURE_FOUNDRY_API_KEY,
      headers: {
        'x-ms-oai-image-generation-deployment':
          AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT as string,
      },
    });

    // create anthropic client
    const anthropic = createAnthropic({
      baseURL: `${AZURE_FOUNDRY_ENDPOINT}${AZURE_ANTHROPIC_API_PATH}`,
      apiKey: AZURE_FOUNDRY_API_KEY,
      headers: {
        'anthropic-version': (AZURE_ANTHROPIC_API_VERSION ??
          '2023-06-01') as string,
        'x-api-key': AZURE_FOUNDRY_API_KEY as string,
      },
    });

    // create deepseek client
    const deepseek = createDeepSeek({
      baseURL: `${AZURE_FOUNDRY_ENDPOINT}${AZURE_DEEPSEEK_API_PATH}`,
      apiKey: AZURE_FOUNDRY_API_KEY,
      headers: {
        'Authorization': `Bearer ${AZURE_FOUNDRY_API_KEY}`,
      },
    });

    // create mistral client
    const mistral = createMistral({
      apiKey: AZURE_FOUNDRY_API_KEY,
      baseURL: AZURE_FOUNDRY_OPENAI_COMPATIBLE_ENDPOINT,
      headers: {
        'Authorization': `Bearer ${AZURE_FOUNDRY_API_KEY}`,
      },
    });

    // create xai client
    const xai = createXai({
      apiKey: AZURE_FOUNDRY_API_KEY,
      baseURL: AZURE_FOUNDRY_OPENAI_COMPATIBLE_ENDPOINT,
      headers: {
        // 'Content-Type': 'application/json',
        'Authorization': `Bearer ${AZURE_FOUNDRY_API_KEY}`,
      },
    });

    // Map model names to their deployment environment variables
    const modelDeploymentMap: Record<string, string | undefined> = {
      'gpt-41-mini': AZURE_OPENAI_GPT41_MINI_DEPLOYMENT,
      'gpt-41': AZURE_OPENAI_GPT41_DEPLOYMENT,
      'gpt-41-nano': AZURE_OPENAI_GPT41_NANO_DEPLOYMENT,
      'gpt-5': AZURE_OPENAI_GPT5_DEPLOYMENT,
      'gpt-5-mini': AZURE_OPENAI_GPT5_MINI_DEPLOYMENT,
      'gpt-5-nano': AZURE_OPENAI_GPT5_NANO_DEPLOYMENT,
      'gpt-5-chat': AZURE_OPENAI_GPT5_CHAT_DEPLOYMENT,
      'gpt-5-codex': AZURE_OPENAI_GPT5_CODEX_DEPLOYMENT,
      'gpt-5.1': AZURE_OPENAI_GPT51_DEPLOYMENT,
      'gpt-5.1-chat': AZURE_OPENAI_GPT51_CHAT_DEPLOYMENT,
      'gpt-5.1-codex': AZURE_OPENAI_GPT51_CODEX_DEPLOYMENT,
      'gpt-5.1-codex-mini': AZURE_OPENAI_GPT51_CODEX_MINI_DEPLOYMENT,
      'gpt-5.1-codex-max': AZURE_OPENAI_GPT51_CODEX_MAX_DEPLOYMENT,
      'gpt-5.2': AZURE_OPENAI_GPT52_DEPLOYMENT,
      'gpt-5.2-chat': AZURE_OPENAI_GPT52_CHAT_DEPLOYMENT,
      'gpt-5.2-codex': AZURE_OPENAI_GPT52_CODEX_DEPLOYMENT,
      'o3': AZURE_OPENAI_O3_DEPLOYMENT,
      'o3-mini': AZURE_OPENAI_O3_MINI_DEPLOYMENT,
      'o4-mini': AZURE_OPENAI_O4_MINI_DEPLOYMENT,
      'claude-sonnet-4-5': AZURE_ANTHROPIC_CLAUDE_SONNET_45_DEPLOYMENT,
      'claude-opus-4-5': AZURE_ANTHROPIC_CLAUDE_OPUS_45_DEPLOYMENT,
      'claude-haiku-4-5': AZURE_ANTHROPIC_CLAUDE_HAIKU_45_DEPLOYMENT,
      'claude-opus-4-6': AZURE_ANTHROPIC_CLAUDE_OPUS_46_DEPLOYMENT,
      'claude-sonnet-4-6': AZURE_ANTHROPIC_CLAUDE_SONNET_46_DEPLOYMENT,
      'DeepSeek-V3.1': AZURE_DEEPSEEK_V31_DEPLOYMENT,
      'DeepSeek-V3.2': AZURE_DEEPSEEK_V32_DEPLOYMENT,
      'DeepSeek-R1-0528': AZURE_DEEPSEEK_R1_0528_DEPLOYMENT,
      'grok-4': AZURE_XAI_GROK_4_DEPLOYMENT,
      'grok-4-fast-non-reasoning':
        AZURE_XAI_GROK_4_FAST_NON_REASONING_DEPLOYMENT,
      'grok-4-fast-reasoning': AZURE_XAI_GROK_4_FAST_REASONING_DEPLOYMENT,
      'grok-code-fast-1': AZURE_XAI_GROK_CODE_FAST_1_DEPLOYMENT,
      'Mistral-Large-3': AZURE_MISTRAL_LARGE_3_DEPLOYMENT,
    };

    const deploymentName = modelDeploymentMap[model];

    if (!deploymentName) {
      throw new Error(
        `No deployment configured for model: ${model}. Please set the corresponding environment variable.`
      );
    }

    // instantiate azure openai model with responses api
    const azureModel = deploymentName.startsWith('claude')
      ? anthropic(deploymentName)
      : deploymentName.toLowerCase().startsWith('deepseek')
        ? wrapLanguageModel({
            model: deepseek(deploymentName),
            middleware: extractReasoningMiddleware({ tagName: 'think' }),
          })
        : deploymentName.toLowerCase().startsWith('mistral')
          ? mistral(deploymentName)
          : deploymentName.toLowerCase().startsWith('grok')
            ? xai(deploymentName)
            : azure(deploymentName);

    // set up streaming options
    const convertedMessages = await convertToModelMessages(uiMessages);

    const baseStreamTextOptions = {
      model: azureModel,
      messages: convertedMessages,
      experimental_transform: smoothStream(),
      abortSignal: req.signal,
    };

    const response = streamText({
      ...baseStreamTextOptions,
      ...(webSearch
        ? {
            tools: {
              web_search_preview: azure.tools.webSearchPreview({
                searchContextSize: 'medium',
              }),
              ...(useImageTool
                ? {
                    image_generation: azure.tools.imageGeneration({
                      outputFormat: 'png',
                    }),
                  }
                : {}),
            },
            toolChoice: 'auto',
          }
        : {}),
      ...(useImageTool && !webSearch
        ? {
            tools: {
              image_generation: azure.tools.imageGeneration({
                outputFormat: 'png',
              }),
            },
          }
        : {}),
    });

    // Return streaming response using native AI SDK pattern
    return response.toUIMessageStreamResponse({
      originalMessages: uiMessages,
      generateMessageId: () => generateId(),
      sendSources: true,
      sendReasoning: true,
      consumeSseStream: consumeStream,
      messageMetadata: ({ part }) => {
        // Attach metadata at message start
        if (part.type === 'start') {
          return {
            model,
            createdAt: new Date().toISOString(),
          };
        }
        // Attach usage metadata at message finish
        if (part.type === 'finish') {
          return {
            totalUsage: part.totalUsage,
          };
        }
      },
      onError: (error: unknown) => {
        const err = error as Error;
        console.error('Chat stream error:', {
          message: err.message,
          name: err.name,
          model,
          timestamp: new Date().toISOString(),
        });
        if (err.message?.includes('deployment')) {
          return 'Model deployment not found. Please contact your administrator.';
        }
        if (err.message?.includes('quota')) {
          return 'API quota exceeded. Please try again later.';
        }
        if (err.message?.includes('authentication')) {
          return 'Authentication failed. Please contact your administrator.';
        }
        return 'An error occurred processing your request. Please try again.';
      },
    });
  } catch (error: unknown) {
    console.error('API route error:', error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
