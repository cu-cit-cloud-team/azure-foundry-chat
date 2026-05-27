import { createAnthropic } from '@ai-sdk/anthropic';
import { createAzure } from '@ai-sdk/azure';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { createMCPClient } from '@ai-sdk/mcp';
import { createXai } from '@ai-sdk/xai';
import {
  consumeStream,
  convertToModelMessages,
  extractReasoningMiddleware,
  generateId,
  type LanguageModelUsage,
  type ModelMessage,
  smoothStream,
  stepCountIs,
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
    AZURE_OPENAI_GPT_CHAT_LATEST_DEPLOYMENT,
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
  AZURE_OPENAI_GPT53_CHAT_DEPLOYMENT,
  AZURE_OPENAI_GPT53_CODEX_DEPLOYMENT,
  AZURE_OPENAI_GPT54_DEPLOYMENT,
  AZURE_OPENAI_GPT54_MINI_DEPLOYMENT,
  AZURE_OPENAI_GPT54_NANO_DEPLOYMENT,
  AZURE_OPENAI_GPT54_PRO_DEPLOYMENT,
  AZURE_OPENAI_GPT55_DEPLOYMENT,
  AZURE_OPENAI_GPT_CHAT_LATEST_DEPLOYMENT,
  AZURE_ANTHROPIC_API_PATH,
  AZURE_ANTHROPIC_API_VERSION,
  AZURE_ANTHROPIC_CLAUDE_HAIKU_45_DEPLOYMENT,
  AZURE_ANTHROPIC_CLAUDE_SONNET_45_DEPLOYMENT,
  AZURE_ANTHROPIC_CLAUDE_OPUS_46_DEPLOYMENT,
  AZURE_ANTHROPIC_CLAUDE_SONNET_46_DEPLOYMENT,
  AZURE_ANTHROPIC_CLAUDE_OPUS_47_DEPLOYMENT,
  AZURE_DEEPSEEK_API_PATH,
  AZURE_DEEPSEEK_R1_0528_DEPLOYMENT,
  AZURE_DEEPSEEK_V32_DEPLOYMENT,
  AZURE_DEEPSEEK_V4_FLASH_DEPLOYMENT,
  AZURE_DEEPSEEK_V4_PRO_DEPLOYMENT,
  AZURE_XAI_GROK_4_1_FAST_NON_REASONING_DEPLOYMENT,
  AZURE_XAI_GROK_4_1_FAST_REASONING_DEPLOYMENT,
  AZURE_XAI_GROK_4_20_NON_REASONING_DEPLOYMENT,
  AZURE_XAI_GROK_4_20_REASONING_DEPLOYMENT,
  AZURE_XAI_GROK_4_3_DEPLOYMENT,
  MCP_SERVER_URL,
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

type InlineUiFilePart = {
  type: 'file';
  url: string;
  mediaType: string;
  filename?: string;
};

type UserContentPart =
  | { type: 'text'; text: string }
  | { type: 'image'; image: string; mediaType?: string }
  | { type: 'file'; data: string; mediaType: string; filename?: string };

type ToolUiPartState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error';

function isInlineUiFilePart(part: unknown): part is InlineUiFilePart {
  return (
    typeof part === 'object' &&
    part !== null &&
    'type' in part &&
    part.type === 'file' &&
    'url' in part &&
    typeof part.url === 'string' &&
    'mediaType' in part &&
    typeof part.mediaType === 'string' &&
    (part.url.startsWith('data:') || part.url.startsWith('blob:'))
  );
}

function getToolUiPartState(part: unknown): ToolUiPartState | null {
  if (!part || typeof part !== 'object') {
    return null;
  }

  const toolPart = part as Record<string, unknown>;
  const type = toolPart.type;

  const isToolPart =
    type === 'dynamic-tool' ||
    (typeof type === 'string' && type.startsWith('tool-'));

  if (!isToolPart) {
    return null;
  }

  const state = toolPart.state;
  return state === 'input-streaming' ||
    state === 'input-available' ||
    state === 'output-available' ||
    state === 'output-error'
    ? state
    : null;
}

function hasIncompleteToolParts(message: UIMessage): boolean {
  return message.parts.some((part) => {
    const state = getToolUiPartState(part);
    return state === 'input-streaming' || state === 'input-available';
  });
}

function pruneTrailingIncompleteToolMessages(
  messages: UIMessage[]
): UIMessage[] {
  let endIndex = messages.length;

  while (endIndex > 0) {
    const message = messages[endIndex - 1];

    if (message.role !== 'assistant' || !hasIncompleteToolParts(message)) {
      break;
    }

    endIndex -= 1;
  }

  return endIndex === messages.length ? messages : messages.slice(0, endIndex);
}

function extractBase64FromDataUrl(dataUrl: string): {
  data: string;
  mediaType: string;
} {
  const match = dataUrl.match(
    /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/
  );

  if (!match) {
    throw new Error(
      'Attachment format is invalid. Please remove the file and add it again.'
    );
  }

  const [, mediaType = 'application/octet-stream', data] = match;

  return {
    data,
    mediaType,
  };
}

function convertInlineUiFilePartToModelPart(
  part: InlineUiFilePart
): UserContentPart {
  if (part.url.startsWith('blob:')) {
    throw new Error(
      'Attachment upload could not be serialized for the server. Please remove the file and add it again.'
    );
  }

  const { data, mediaType } = extractBase64FromDataUrl(part.url);

  if (mediaType.startsWith('image/')) {
    return {
      type: 'image',
      image: data,
      mediaType,
    };
  }

  return {
    type: 'file',
    data,
    mediaType,
    filename: part.filename,
  };
}

function normalizeUserMessageContent(
  content: ModelMessage['content']
): UserContentPart[] {
  if (typeof content === 'string') {
    return [{ type: 'text', text: content }];
  }

  return content as UserContentPart[];
}

async function convertUserMessageWithInlineUploads(
  message: UIMessage
): Promise<ModelMessage> {
  const content: UserContentPart[] = [];

  for (const part of message.parts) {
    if (isInlineUiFilePart(part)) {
      content.push(convertInlineUiFilePartToModelPart(part));
      continue;
    }

    const [convertedMessage] = await convertToModelMessages([
      {
        ...message,
        parts: [part],
      },
    ]);

    if (!convertedMessage) {
      continue;
    }

    if (convertedMessage.role !== 'user') {
      throw new Error(
        'Expected a user model message during attachment conversion.'
      );
    }

    content.push(...normalizeUserMessageContent(convertedMessage.content));
  }

  return {
    role: 'user',
    content,
  };
}

async function convertUiMessagesForModel(
  messages: UIMessage[]
): Promise<ModelMessage[]> {
  const convertedMessageGroups = await Promise.all(
    messages.map(async (message) => {
      const hasInlineUploads =
        message.role === 'user' && message.parts.some(isInlineUiFilePart);

      if (!hasInlineUploads) {
        const convertedMessages = await convertToModelMessages([message]);

        if (convertedMessages.length === 0) {
          throw new Error('Failed to convert chat message for the model.');
        }

        return convertedMessages;
      }

      return [await convertUserMessageWithInlineUploads(message)];
    })
  );

  return convertedMessageGroups.flat();
}

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
    const systemPrompt: UIMessage = {
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
    const sanitizedMessages = pruneTrailingIncompleteToolMessages(messages);
    const uiMessages = hasSystemPrompt
      ? sanitizedMessages
      : [systemPrompt, ...sanitizedMessages];

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
      'gpt-5.3-chat': AZURE_OPENAI_GPT53_CHAT_DEPLOYMENT,
      'gpt-5.3-codex': AZURE_OPENAI_GPT53_CODEX_DEPLOYMENT,
      'gpt-5.4': AZURE_OPENAI_GPT54_DEPLOYMENT,
      'gpt-5.4-mini': AZURE_OPENAI_GPT54_MINI_DEPLOYMENT,
      'gpt-5.4-nano': AZURE_OPENAI_GPT54_NANO_DEPLOYMENT,
      'gpt-5.4-pro': AZURE_OPENAI_GPT54_PRO_DEPLOYMENT,
      'gpt-5.5': AZURE_OPENAI_GPT55_DEPLOYMENT,
      'gpt-chat-latest': AZURE_OPENAI_GPT_CHAT_LATEST_DEPLOYMENT,
      'claude-sonnet-4-5': AZURE_ANTHROPIC_CLAUDE_SONNET_45_DEPLOYMENT,
      'claude-haiku-4-5': AZURE_ANTHROPIC_CLAUDE_HAIKU_45_DEPLOYMENT,
      'claude-opus-4-6': AZURE_ANTHROPIC_CLAUDE_OPUS_46_DEPLOYMENT,
      'claude-sonnet-4-6': AZURE_ANTHROPIC_CLAUDE_SONNET_46_DEPLOYMENT,
      'claude-opus-4-7': AZURE_ANTHROPIC_CLAUDE_OPUS_47_DEPLOYMENT,
      'DeepSeek-V3.2': AZURE_DEEPSEEK_V32_DEPLOYMENT,
      'DeepSeek-V4-Flash': AZURE_DEEPSEEK_V4_FLASH_DEPLOYMENT,
      'DeepSeek-V4-Pro': AZURE_DEEPSEEK_V4_PRO_DEPLOYMENT,
      'DeepSeek-R1-0528': AZURE_DEEPSEEK_R1_0528_DEPLOYMENT,
      'grok-4-1-fast-non-reasoning': AZURE_XAI_GROK_4_1_FAST_NON_REASONING_DEPLOYMENT,
      'grok-4-1-fast-reasoning': AZURE_XAI_GROK_4_1_FAST_REASONING_DEPLOYMENT,
      'grok-4-20-fast-non-reasoning': AZURE_XAI_GROK_4_20_NON_REASONING_DEPLOYMENT,
      'grok-4-20-fast-reasoning': AZURE_XAI_GROK_4_20_REASONING_DEPLOYMENT,
      'grok-4.3': AZURE_XAI_GROK_4_3_DEPLOYMENT,
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
        : deploymentName.toLowerCase().startsWith('grok')
          ? xai(deploymentName)
          : azure(deploymentName);

    // set up streaming options
    const convertedMessages = await convertUiMessagesForModel(uiMessages);

    const baseStreamTextOptions = {
      model: azureModel,
      messages: convertedMessages,
      abortSignal: req.signal,
    };

    // set useMcpServer to true if MCP_SERVER_URL is provided, otherwise false
    const useMcpServer = Boolean(MCP_SERVER_URL);

    let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | undefined;
    let mcpTools = {};

    if (useMcpServer) {
      mcpClient = await createMCPClient({
        transport: {
          type: 'http',
          url: MCP_SERVER_URL as string,
        },
      });

      mcpTools = await mcpClient.tools();
    }

    // console.log(JSON.stringify(mcpTools, null, 2));

    const tools = {
      ...(useMcpServer ? mcpTools : {}),
      ...(webSearch
        ? {
            web_search_preview: azure.tools.webSearchPreview({
              searchContextSize: 'medium',
            }),
          }
        : {}),
      ...(useImageTool
        ? {
            image_generation: azure.tools.imageGeneration({
              outputFormat: 'png',
            }),
          }
        : {}),
    };

    const response = streamText({
      ...baseStreamTextOptions,
      tools,
      experimental_transform: smoothStream(),
      stopWhen: stepCountIs(5), // enable server-side loop: tool call -> tool result -> final text
      onFinish: async () => {
        await mcpClient?.close();
      },
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
        // console.log(JSON.stringify(part, null, 2));
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
