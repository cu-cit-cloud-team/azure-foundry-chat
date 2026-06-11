import { code } from '@streamdown/code';
import type { UIMessage } from 'ai';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Bot, Check, Copy, Loader2, RefreshCw, Trash2, User } from 'lucide-react';
import { Fragment, memo, useCallback, useMemo } from 'react';

import {
  Attachment,
  AttachmentInfo,
  AttachmentPreview,
  Attachments,
} from '@/app/components/ai-elements/attachments';
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from '@/app/components/ai-elements/message';
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/app/components/ai-elements/reasoning';
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from '@/app/components/ai-elements/sources';
import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from '@/app/components/ai-elements/tool';
import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import type {
  MessageFileAttachment,
  ReasoningUIPart,
  ToolUIPart,
  UserMeta,
} from '@/app/types';
import {
  createBase64FileAttachment,
  getMessageFiles,
  getMessageText,
  getSourceTitle,
  splitMessageFiles,
} from '@/app/utils/messageHelpers';
import { DEFAULT_MODEL_NAME, modelStringFromName } from '@/app/utils/models';

// Extend dayjs plugins for time helpers
// These calls are idempotent and safe on every import
dayjs.extend(isToday);
dayjs.extend(relativeTime);

type StoredMessage = UIMessage & {
  model?: string;
  createdAt?: string;
};

type RenderableToolState =
  | 'input-streaming'
  | 'input-available'
  | 'output-available'
  | 'output-error';

type NormalizedToolPart = {
  kind: 'dynamic' | 'typed';
  type: `tool-${string}`;
  toolName: string;
  state: RenderableToolState;
  input: unknown;
  output: unknown;
  errorText?: string;
  hasImageOutput: boolean;
};

function isRenderableToolState(value: unknown): value is RenderableToolState {
  return (
    value === 'input-streaming' ||
    value === 'input-available' ||
    value === 'output-available' ||
    value === 'output-error'
  );
}

function getToolState(value: unknown): RenderableToolState {
  return isRenderableToolState(value) ? value : 'input-available';
}

function normalizeToolPart(part: unknown): NormalizedToolPart | null {
  if (!part || typeof part !== 'object') {
    return null;
  }

  const toolPart = part as Record<string, unknown>;

  if (toolPart.type === 'dynamic-tool') {
    const toolName =
      typeof toolPart.toolName === 'string' ? toolPart.toolName : 'tool';
    const hasImageOutput =
      toolName === 'image_generation' &&
      !!toolPart.output &&
      typeof toolPart.output === 'object' &&
      'result' in (toolPart.output as Record<string, unknown>);

    return {
      kind: 'dynamic',
      type: `tool-${toolName}`,
      toolName,
      state: getToolState(toolPart.state),
      input: toolPart.input,
      output: toolPart.output,
      errorText:
        typeof toolPart.errorText === 'string' ? toolPart.errorText : undefined,
      hasImageOutput,
    };
  }

  if (typeof toolPart.type === 'string' && toolPart.type.startsWith('tool-')) {
    const typedToolPart = toolPart as ToolUIPart;
    const toolName = typedToolPart.type.split('tool-')[1] || 'tool';
    const hasImageOutput =
      typedToolPart.type === 'tool-image_generation' &&
      !!typedToolPart.output &&
      typeof typedToolPart.output === 'object' &&
      'result' in typedToolPart.output;

    return {
      kind: 'typed',
      type: typedToolPart.type,
      toolName,
      state: getToolState(typedToolPart.state),
      input: typedToolPart.input,
      output: typedToolPart.output,
      errorText: typedToolPart.errorText,
      hasImageOutput,
    };
  }

  return null;
}

function extractMcpTextOutput(output: unknown): string | null {
  if (!output || typeof output !== 'object') {
    return null;
  }

  const outputObject = output as Record<string, unknown>;
  if (!Array.isArray(outputObject.content)) {
    return null;
  }

  const textChunks = outputObject.content
    .map((contentPart) => {
      if (!contentPart || typeof contentPart !== 'object') {
        return null;
      }
      const typedPart = contentPart as Record<string, unknown>;
      return typedPart.type === 'text' && typeof typedPart.text === 'string'
        ? typedPart.text
        : null;
    })
    .filter((text): text is string => Boolean(text));

  return textChunks.length > 0 ? textChunks.join('\n\n') : null;
}

export interface MessagesProps {
  messages: UIMessage[];
  userMeta?: UserMeta;
  chatStatus?: 'ready' | 'submitted' | 'streaming' | 'error';
  copiedMessageId: string | null;
  onCopy: (messageId: string, text: string) => void;
  onRegenerate: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onFileClick: (file: MessageFileAttachment) => void;
}

export const Messages = ({
  messages,
  userMeta,
  chatStatus,
  copiedMessageId,
  onCopy,
  onRegenerate,
  onDelete,
  onFileClick,
}: MessagesProps) => {
  return (
    <Fragment>
      {messages.map((message, index) => (
        <MessageRow
          key={message.id}
          message={message}
          isLastMessage={index === messages.length - 1}
          userMeta={userMeta}
          chatStatus={chatStatus}
          copiedMessageId={copiedMessageId}
          onCopy={onCopy}
          onRegenerate={onRegenerate}
          onDelete={onDelete}
          onFileClick={onFileClick}
        />
      ))}
    </Fragment>
  );
};

interface MessageRowProps {
  message: UIMessage;
  isLastMessage: boolean;
  userMeta?: UserMeta;
  chatStatus?: 'ready' | 'submitted' | 'streaming' | 'error';
  copiedMessageId: string | null;
  onCopy: (messageId: string, text: string) => void;
  onRegenerate: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onFileClick: (file: MessageFileAttachment) => void;
}

interface MessageAttachmentsProps {
  files: MessageFileAttachment[];
  isUser: boolean;
  onFileClick: (file: MessageFileAttachment) => void;
}

type MessageAttachmentGroupProps = MessageAttachmentsProps & {
  variant: 'grid' | 'list';
};

const MessageAttachmentGroup = memo(
  ({ files, isUser, onFileClick, variant }: MessageAttachmentGroupProps) => {
    const alignmentClass = isUser ? 'ml-auto justify-end' : 'justify-start';
    const widthClass =
      variant === 'list'
        ? 'w-full max-w-full sm:max-w-[40%]'
        : 'max-w-full sm:max-w-[40%]';

    return (
      <Attachments
        variant={variant}
        className={`${alignmentClass} ${widthClass} min-w-0`}
      >
        {files.map((file) => {
          const handleClick = () => onFileClick(file);

          return (
            <button
              key={file.id}
              type='button'
              className={
                variant === 'list'
                  ? 'block w-full max-w-full min-w-0 text-left'
                  : 'block max-w-full min-w-0 text-left'
              }
              onClick={handleClick}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleClick();
                }
              }}
            >
              <Attachment
                data={file}
                className='max-w-full min-w-0 cursor-pointer transition-opacity hover:opacity-80'
              >
                <AttachmentPreview />
                <AttachmentInfo showMediaType={variant === 'list'} />
              </Attachment>
            </button>
          );
        })}
      </Attachments>
    );
  }
);

MessageAttachmentGroup.displayName = 'MessageAttachmentGroup';

const MessageAttachments = memo(
  ({ files, isUser, onFileClick }: MessageAttachmentsProps) => {
    if (files.length === 0) {
      return null;
    }

    const { imageFiles, otherFiles } = splitMessageFiles(files);

    if (imageFiles.length > 0 && otherFiles.length > 0) {
      return (
        <div className='flex flex-col gap-2'>
          <MessageAttachmentGroup
            files={imageFiles}
            isUser={isUser}
            onFileClick={onFileClick}
            variant='grid'
          />
          <MessageAttachmentGroup
            files={otherFiles}
            isUser={isUser}
            onFileClick={onFileClick}
            variant='list'
          />
        </div>
      );
    }

    return (
      <MessageAttachmentGroup
        files={files}
        isUser={isUser}
        onFileClick={onFileClick}
        variant={imageFiles.length > 0 ? 'grid' : 'list'}
      />
    );
  }
);

MessageAttachments.displayName = 'MessageAttachments';

const MessageRow = memo(
  ({
    message,
    isLastMessage,
    userMeta,
    chatStatus,
    copiedMessageId,
    onCopy,
    onRegenerate,
    onDelete,
    onFileClick,
  }: MessageRowProps) => {
    const isUser = message.role === 'user';
    const isStreamingState =
      chatStatus === 'streaming' || chatStatus === 'submitted';
    const actionsLocked = isStreamingState;

    const fileParts = useMemo(() => getMessageFiles(message), [message]);

    const messageText = useMemo(() => getMessageText(message), [message]);

    const storedMessage = message as StoredMessage;
    // Check metadata.model (for live messages from API) OR top-level model (for persisted messages from IndexedDB)
    const messageModel =
      (message.metadata as { model?: string } | undefined)?.model ||
      storedMessage.model ||
      DEFAULT_MODEL_NAME;
    const messageCreatedAt =
      (message.metadata as { createdAt?: string } | undefined)?.createdAt ||
      storedMessage.createdAt ||
      new Date().toISOString();

    const handleCopy = useCallback(() => {
      if (actionsLocked) {
        return;
      }

      if (messageText) {
        onCopy(message.id, messageText);
      }
    }, [actionsLocked, message.id, messageText, onCopy]);

    const handleRegenerate = useCallback(() => {
      if (actionsLocked) {
        return;
      }

      onRegenerate(message.id);
    }, [actionsLocked, message.id, onRegenerate]);

    const handleDelete = useCallback(() => {
      if (actionsLocked) {
        return;
      }

      onDelete(message.id);
    }, [actionsLocked, message.id, onDelete]);

    const handleFileClick = useCallback(
      (file: MessageFileAttachment) => onFileClick(file),
      [onFileClick]
    );

    const renderToolPart = useCallback(
      (part: NormalizedToolPart, key: string) => {
        const mcpTextOutput =
          part.state === 'output-available'
            ? extractMcpTextOutput(part.output)
            : null;

        // Keep tool output compact for generated images while preserving full image preview below.
        const displayOutput =
          part.toolName === 'image_generation' &&
          part.output &&
          typeof part.output === 'object' &&
          'result' in (part.output as Record<string, unknown>) &&
          typeof (part.output as { result?: unknown }).result === 'string'
            ? {
                ...(part.output as Record<string, unknown>),
                result: `${(part.output as { result: string }).result.substring(0, 60)}... (truncated)`,
              }
            : part.output;

        return (
          <Fragment key={key}>
            <Tool className='w-full'>
              <ToolHeader
                title={part.toolName}
                type={part.type}
                state={part.state}
              />
              <ToolContent>
                <ToolInput input={part.input} />
                {part.state === 'output-available' && mcpTextOutput ? (
                  <MessageResponse
                    mode='streaming'
                    parseIncompleteMarkdown
                    isAnimating={false}
                    shikiTheme={['github-light', 'github-dark']}
                    plugins={{ code: code }}
                  >
                    {mcpTextOutput}
                  </MessageResponse>
                ) : (
                  part.output !== undefined && (
                    <ToolOutput output={displayOutput} errorText={part.errorText} />
                  )
                )}
              </ToolContent>
            </Tool>

            {part.hasImageOutput &&
            part.output &&
            typeof part.output === 'object' &&
            'result' in part.output &&
            typeof (part.output as { result?: unknown }).result === 'string' ? (
              <MessageAttachments
                files={[
                  createBase64FileAttachment({
                    id: `${message.id}-${key}-image`,
                    base64Data: (part.output as { result: string }).result,
                    filename: `${message.id}.png`,
                    mediaType: 'image/png',
                    title: `${message.id}.png`,
                  }),
                ]}
                isUser={false}
                onFileClick={onFileClick}
              />
            ) : null}
          </Fragment>
        );
      },
      [message.id, onFileClick]
    );

    return (
      <Message from={message.role}>
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <Avatar className='size-8'>
            <AvatarFallback
              className={
                isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground'
              }
            >
              {isUser ? <User className='size-4' /> : <Bot className='size-4' />}
            </AvatarFallback>
          </Avatar>

          <div className='flex-1 flex flex-col gap-2'>
            <MessageAttachments
              files={fileParts}
              isUser={isUser}
              onFileClick={handleFileClick}
            />

            <MessageContent>
              {/* Render Sources if available (before all other content) */}
              {!isUser && message.parts.some((p) => p.type === 'source-url') && (
                <Sources>
                  <SourcesTrigger
                    count={
                      message.parts.filter((p) => p.type === 'source-url').length
                    }
                  />
                  <SourcesContent>
                    {message.parts
                      .filter((p) => p.type === 'source-url')
                      .map((part, idx) => {
                        const sourcePart = part as unknown as Record<
                          string,
                          unknown
                        >;
                        const url = (
                          typeof sourcePart.url === 'string'
                            ? sourcePart.url
                            : typeof sourcePart.href === 'string'
                              ? sourcePart.href
                              : ''
                        ) as string;
                        const title = (
                          typeof sourcePart.title === 'string'
                            ? sourcePart.title
                            : getSourceTitle(url)
                        ) as string;
                        const sourceId = (
                          typeof sourcePart.sourceId === 'string'
                            ? sourcePart.sourceId
                            : typeof sourcePart.id === 'string'
                              ? sourcePart.id
                              : undefined
                        ) as string | undefined;
                        return (
                          <Source
                            key={sourceId || `${message.id}-source-${idx}`}
                            href={url}
                            title={title}
                          />
                        );
                      })}
                  </SourcesContent>
                </Sources>
              )}

              {/* Render message parts using switch-based pattern */}
              {message.parts.map((part, i) => {
                const isStreamingPart =
                  isLastMessage &&
                  isStreamingState &&
                  i === message.parts.length - 1;

                switch (part.type) {
                  case 'step-start': {
                    // Show step boundaries for multi-step tool calls
                    return i > 0 ? (
                      <div key={`${message.id}-${i}`} className='text-gray-500'>
                        <hr className='my-2 border-gray-300' />
                      </div>
                    ) : null;
                  }
                  case 'tool-input-start':
                  case 'tool-input-end': {
                    // These are internal streaming events, don't render
                    return null;
                  }

                  case 'reasoning': {
                    if (isUser) {
                      return null;
                    }
                    const reasoningPart = part as ReasoningUIPart;
                    const hasReasoningText =
                      reasoningPart.text && reasoningPart.text.trim() !== '';

                    // Don't render empty reasoning if not streaming
                    if (!hasReasoningText && !isStreamingPart) {
                      return null;
                    }

                    return (
                      <Reasoning
                        key={`${message.id}-${i}`}
                        isStreaming={isStreamingPart}
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>
                          {hasReasoningText ? reasoningPart.text : '_Reasoning..._'}
                        </ReasoningContent>
                      </Reasoning>
                    );
                  }

                  case 'text': {
                    // Text is already concatenated and rendered after the switch
                    return null;
                  }

                  case 'file': {
                    // Files are already collected and rendered after the switch
                    return null;
                  }

                  case 'source-url': {
                    // Sources are already rendered before the switch
                    return null;
                  }

                  case 'source-document': {
                    // Render document sources (similar to source-url but for documents)
                    if (isUser) {
                      return null;
                    }
                    const docPart = part as unknown as Record<string, unknown>;
                    const title =
                      typeof docPart.title === 'string'
                        ? docPart.title
                        : `Document ${typeof docPart.id === 'string' ? docPart.id : i}`;
                    return (
                      <span
                        key={`${message.id}-${i}`}
                        className='text-xs text-muted-foreground'
                      >
                        [{title}]
                      </span>
                    );
                  }
                  default: {
                    if (isUser) {
                      return null;
                    }

                    const normalizedToolPart = normalizeToolPart(part);
                    if (normalizedToolPart) {
                      return renderToolPart(
                        normalizedToolPart,
                        `${message.id}-${i}`
                      );
                    }

                    // Unhandled part types
                    if (process.env.NODE_ENV === 'development') {
                      console.warn('Unhandled part type:', part.type, part);
                    }
                    return null;
                  }
                }
              })}

              {/* Render concatenated text content */}
              {messageText && (
                <MessageResponse
                  // Use component props (not key) so the message body isn't remounted
                  // when streaming status changes to ready.
                  mode='streaming'
                  parseIncompleteMarkdown
                  isAnimating={isLastMessage && isStreamingState && !isUser}
                  shikiTheme={['github-light', 'github-dark']}
                  plugins={{ code: code }}
                >
                  {messageText}
                </MessageResponse>
              )}

              {/* Loading indicator */}
              {!isUser && isStreamingState && isLastMessage && !messageText && (
                <div className='flex items-center gap-2 text-muted-foreground'>
                  <Loader2 className='size-4 animate-spin' />
                  <span className='text-sm'>Thinking...</span>
                </div>
              )}
            </MessageContent>

            {/* Hide meta for assistant messages while streaming */}
            {!(isLastMessage && isStreamingState && !isUser) && (
              <div
                className={`mt-1 text-xs text-muted-foreground ${isUser ? 'text-right' : ''}`}
                title={
                  dayjs(messageCreatedAt).isToday()
                    ? dayjs(messageCreatedAt).format('h:mm a')
                    : dayjs(messageCreatedAt).format('ddd MMM DD YYYY [at] h:mm a')
                }
              >
                {isUser ? (
                  <>
                    {userMeta?.name || 'User'} • {dayjs(messageCreatedAt).fromNow()}
                  </>
                ) : (
                  <>
                    {modelStringFromName(messageModel)} •{' '}
                    {dayjs(messageCreatedAt).fromNow()}
                  </>
                )}
              </div>
            )}

            {messageText && (
              <MessageActions className={`mt-2 ${isUser ? 'justify-end' : ''}`}>
                <MessageAction
                  tooltip={
                    copiedMessageId === message.id ? 'Copied!' : 'Copy message'
                  }
                  disabled={actionsLocked}
                  onClick={handleCopy}
                >
                  {copiedMessageId === message.id ? (
                    <Check className='size-4' />
                  ) : (
                    <Copy className='size-4' />
                  )}
                </MessageAction>

                {isLastMessage && (
                  <MessageAction
                    disabled={actionsLocked}
                    tooltip='Regenerate response'
                    onClick={handleRegenerate}
                  >
                    <RefreshCw className='size-4' />
                  </MessageAction>
                )}

                <MessageAction
                  disabled={actionsLocked}
                  tooltip='Delete message'
                  onClick={handleDelete}
                >
                  <Trash2 className='size-4' />
                </MessageAction>
              </MessageActions>
            )}
          </div>
        </div>
      </Message>
    );
  }
);

MessageRow.displayName = 'MessageRow';
