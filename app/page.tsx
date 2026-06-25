'use client';

import { useChat } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { DefaultChatTransport } from 'ai';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useAtom, useAtomValue } from 'jotai';
import { MessageSquare } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
  ConversationScrollButton,
} from '@/app/components/ai-elements/conversation';
import { DeleteMessageDialog } from '@/app/components/chat/DeleteMessageDialog';
import { Messages } from '@/app/components/chat/Messages';
import { ImageModal, PdfModal, TextFileModal } from '@/app/components/chat/Modals';
import { ErrorFallback } from '@/app/components/ErrorFallback';
import { Footer } from '@/app/components/Footer';
import { Header } from '@/app/components/Header';
import { database } from '@/app/database/database.config';
import { useClipboardFeedback } from '@/app/hooks/useClipboardFeedback';
import { useDeleteMessage } from '@/app/hooks/useDeleteMessage';
import { useMessageModals } from '@/app/hooks/useMessageModals';
import type { StoredMessage } from '@/app/hooks/useMessagePersistence';
import { useMessagePersistence } from '@/app/hooks/useMessagePersistence';
import { useRegenerateMessage } from '@/app/hooks/useRegenerateMessage';
import type { FileUIPart } from '@/app/types';
import {
  isLoadingAtom,
  modelAtom,
  systemMessageAtom,
  userMetaAtom,
} from '@/app/utils/atoms';

dayjs.extend(isToday);
dayjs.extend(relativeTime);

// Text file MIME types that should be read as text content
const TEXT_TYPES = new Set([
  'application/json',
  'application/typescript',
  'application/x-sh',
  'application/xml',
  'application/yaml',
  'text/css',
  'text/csv',
  'text/html',
  'text/javascript',
  'text/markdown',
  'text/plain',
  'text/x-csv',
  'text/x-golang',
  'text/x-java',
  'text/x-php',
  'text/x-python',
  'text/x-ruby',
  'text/x-script.python',
  'text/x-sass',
  'text/x-scss',
]);

export default function App() {
  const systemMessageRef = useRef<HTMLTextAreaElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  const [initialMessages, setInitialMessages] = useState<StoredMessage[] | null>(
    null
  );
  const [initialMessagesError, setInitialMessagesError] = useState<string | null>(
    null
  );

  // One-time Dexie load to hydrate initial messages for useChat
  useEffect(() => {
    let isCancelled = false;

    const loadMessages = async () => {
      try {
        // Load all messages on initial hydration; we'll scope them later in ChatInner
        const messages = await database.messages.toArray();
        const sorted = [...messages].sort((a, b) => {
          const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aTime - bTime;
        });
        if (!isCancelled) {
          console.log(
            '[chat] Loaded initial messages from IndexedDB:',
            sorted.length
          );
          setInitialMessages(sorted);
        }
      } catch (error) {
        console.error('Failed to load messages from IndexedDB', error);
        if (!isCancelled) {
          setInitialMessages([]);
          setInitialMessagesError('Failed to load previous conversation.');
        }
      }
    };

    void loadMessages();

    return () => {
      isCancelled = true;
    };
  }, []);

  // While initial messages are loading, show a lightweight shell to avoid
  // hydration flicker and scroll jumps. Do NOT call useChat here.
  if (initialMessages === null) {
    return (
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <Header
          isLoading={false}
          systemMessageRef={systemMessageRef}
          chatError={initialMessagesError}
          onClearError={() => setInitialMessagesError(null)}
          setMessages={() => {}}
          focusTextarea={() => {}}
          messages={[]}
        />

        <div className='flex flex-col h-screen pt-14 pb-40'>
          <Conversation className='flex-1'>
            <ConversationContent className='max-w-5xl mx-auto px-4'>
              <div className='mt-8 text-sm text-muted-foreground'>
                Loading chat interface...
              </div>
            </ConversationContent>
          </Conversation>
        </div>

        <Footer
          onSubmit={() => {}}
          isLoading={false}
          focusTextarea={() => {}}
          promptInputRef={promptInputRef}
          useWebSearch={false}
          onToggleWebSearch={() => {}}
          chatStatus='ready'
          onStop={() => {}}
        />
      </ErrorBoundary>
    );
  }

  // Once initialMessages are loaded, render the actual chat that owns useChat.
  return (
    <ChatInner
      initialMessages={initialMessages}
      systemMessageRef={systemMessageRef}
      promptInputRef={promptInputRef}
      initialError={initialMessagesError}
    />
  );
}

type ChatInnerProps = {
  initialMessages: StoredMessage[];
  systemMessageRef: React.RefObject<HTMLTextAreaElement | null>;
  promptInputRef: React.RefObject<HTMLTextAreaElement | null>;
  initialError?: string | null;
};

function ChatInner({
  initialMessages,
  systemMessageRef,
  promptInputRef,
  initialError,
}: ChatInnerProps) {
  const [useWebSearch, setUseWebSearch] = useState(false);
  const useWebSearchRef = useRef(useWebSearch);

  const focusTextarea = useCallback(() => {
    setTimeout(() => {
      if (document?.activeElement !== systemMessageRef.current) {
        promptInputRef.current?.focus();
      }
    }, 0);
  }, [systemMessageRef, promptInputRef]);

  useEffect(() => {
    useWebSearchRef.current = useWebSearch;
  }, [useWebSearch]);

  // Focus PromptInput on mount (unless system message textarea is focused)
  useEffect(() => {
    if (document?.activeElement !== systemMessageRef.current) {
      promptInputRef.current?.focus();
    }
  }, [systemMessageRef, promptInputRef]);

  const modelName = useAtomValue(modelAtom);
  const systemMessage = useAtomValue(systemMessageAtom);
  const userMeta = useAtomValue(userMetaAtom);

  const modelNameRef = useRef(modelName);
  // Track the model for the current conversation turn (user message + assistant response)
  const activeTurnModelRef = useRef(modelName);

  useEffect(() => {
    modelNameRef.current = modelName;
  }, [modelName]);

  // Reset web search to off when model changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: setUseWebSearch is stable
  useEffect(() => {
    setUseWebSearch(false);
  }, [modelName]);

  const userId = useMemo(
    () => (userMeta?.email ? btoa(userMeta?.email) : undefined),
    [userMeta]
  );
  const [chatError, setChatError] = useState<string | null>(initialError ?? null);

  const chatId = useMemo(
    () => (userId ? `${userId}-chat` : 'local-chat'),
    [userId]
  );

  // Filter initial messages to the active chat (include legacy messages without chatId)
  const filteredInitialMessages = useMemo(() => {
    return initialMessages.filter((m) => m.chatId === chatId || m.chatId == null);
  }, [initialMessages, chatId]);

  // Create transport that updates when parameters change
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: '/api/chat',
        prepareSendMessagesRequest: ({ messages }) => {
          return {
            body: {
              messages,
              systemMessage,
              model: modelNameRef.current,
              id: userId,
              webSearch: useWebSearchRef.current,
            },
          };
        },
      }),
    [systemMessage, userId]
  );

  // Request persistent storage on supported browsers to reduce eviction risk
  useEffect(() => {
    const tryPersist = async () => {
      try {
        const storage = (
          navigator as unknown as {
            storage?: {
              persisted?: () => Promise<boolean>;
              persist?: () => Promise<boolean>;
            };
          }
        ).storage;
        if (storage && typeof storage.persisted === 'function') {
          const isPersisted = await storage.persisted();
          if (!isPersisted && typeof storage.persist === 'function') {
            await storage.persist();
            console.log('[storage] Requested persistent storage');
          }
        }
      } catch (e) {
        // Non-fatal; persistence is best-effort
        console.warn('Storage persistence request failed', e);
      }
    };

    void tryPersist();
  }, []);

  const { messages, setMessages, sendMessage, status, stop } = useChat({
    id: chatId,
    messages: filteredInitialMessages,
    transport,
    onError: (error: Error | { message?: string }) => {
      console.error(error);
      setChatError(error?.message || 'An error occurred. Please try again.');

      // Remove the failed empty assistant message (AI SDK best practice)
      setMessages((currentMessages) => {
        if (currentMessages.length === 0) {
          return currentMessages;
        }

        const lastMessage = currentMessages[currentMessages.length - 1];
        if (lastMessage.role === 'assistant') {
          return currentMessages.slice(0, -1);
        }
        return currentMessages;
      });
    },
    onEnd: ({ message }) => {
      // Extract model from API metadata (set by messageMetadata callback in API route)
      const model =
        (message.metadata as { model?: string } | undefined)?.model ||
        modelNameRef.current;

      const messageWithModel: StoredMessage = {
        ...message,
        model,
        createdAt:
          (message.metadata as { createdAt?: string } | undefined)?.createdAt ||
          new Date().toISOString(),
      };

      // Save to IndexedDB only - don't mutate useChat's internal state
      addMessage(
        messageWithModel as StoredMessage & {
          model: string;
          createdAt: string;
        }
      );
    },
  });

  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    if (wasLoadingRef.current && !isLoading) {
      focusTextarea();
    }
    wasLoadingRef.current = isLoading;
  }, [isLoading, focusTextarea]);

  useEffect(() => {
    setIsLoading(status !== 'ready');
  }, [status, setIsLoading]);

  // Message persistence: seed from initialMessages only once via hook
  const { addMessage } = useMessagePersistence({
    messages,
    currentModel: modelNameRef.current,
    savedMessages: initialMessages,
    chatId,
    activeTurnModel: activeTurnModelRef.current,
  });

  const handleClearError = useCallback(() => {
    setChatError(null);
  }, []);

  const handlePromptSubmit = useCallback(
    async (message: { text: string; files: FileUIPart[] }) => {
      setChatError(null);

      const parts: UIMessage['parts'] = [];

      if (message.text.trim()) {
        parts.push({ type: 'text', text: message.text.trim() });
      }

      // Process files: text files become text parts, images/PDFs stay as file parts
      for (const file of message.files) {
        const fileName = file.filename || 'file';
        const isTextFile = TEXT_TYPES.has(file.mediaType);
        const isImage = file.mediaType.startsWith('image/');
        const isPdf = file.mediaType === 'application/pdf';

        if (isTextFile && file.url) {
          try {
            const response = await fetch(file.url);
            const text = await response.text();
            parts.push({
              type: 'text',
              text: `[File: ${fileName}]\n${text}`,
            });
          } catch (error) {
            console.error(`Failed to read text file ${fileName}:`, error);
          }
        } else if (isImage && file.url) {
          parts.push({
            type: 'file',
            url: file.url,
            mediaType: file.mediaType,
            filename: fileName,
          });
        } else if (isPdf && file.url) {
          parts.push({
            type: 'file',
            url: file.url,
            mediaType: 'application/pdf',
            filename: fileName,
          });
        }
      }

      if (parts.length > 0) {
        // Capture the model for this conversation turn
        activeTurnModelRef.current = modelNameRef.current;
        sendMessage({ parts });
      }
    },
    [sendMessage]
  );

  const handleToggleWebSearch = useCallback(() => {
    setUseWebSearch((prev) => !prev);
    focusTextarea();
  }, [focusTextarea]);

  // subscribe to storage change events so multiple tabs stay in sync
  useEffect(() => {
    const handleStorageChanges = (e: StorageEvent) => {
      const keysToHandle = [
        'model',
        'systemMessage',
        'theme',
        'tokens',
        'userMeta',
      ];
      if (e.key && keysToHandle.includes(e.key)) {
        // atoms sync from localStorage
      }
    };

    window.addEventListener('storage', handleStorageChanges);

    return () => {
      window.removeEventListener('storage', handleStorageChanges);
    };
  }, []);

  const { copiedMessageId, handleCopyMessage } = useClipboardFeedback();
  const {
    modalImageUrl,
    modalTextFile,
    modalPdfFile,
    handleFileClick,
    closeImage,
    closeText,
    closePdf,
  } = useMessageModals();
  const {
    showDeleteDialog,
    handleDeleteMessage,
    confirmDeleteMessage,
    cancelDeleteMessage,
  } = useDeleteMessage(setMessages, chatId);

  const handleDeleteDialogOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        cancelDeleteMessage();
      }
    },
    [cancelDeleteMessage]
  );

  const { handleRegenerateResponse } = useRegenerateMessage(
    messages,
    setMessages,
    sendMessage,
    chatId
  );

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Header
        isLoading={isLoading}
        systemMessageRef={systemMessageRef}
        chatError={chatError}
        onClearError={handleClearError}
        setMessages={setMessages}
        focusTextarea={focusTextarea}
        messages={messages}
      />

      <div className='flex flex-col h-screen pt-14 pb-40'>
        <Conversation className='flex-1'>
          <ConversationContent className='max-w-5xl mx-auto px-4'>
            {messages.length === 0 ? (
              <ConversationEmptyState
                title='Start a conversation'
                icon={<MessageSquare className='size-12' />}
                description="Ask me anything, and I'll do my best to help!"
              />
            ) : (
              <Messages
                messages={messages}
                userMeta={userMeta}
                chatStatus={status}
                copiedMessageId={copiedMessageId}
                onCopy={handleCopyMessage}
                onRegenerate={handleRegenerateResponse}
                onDelete={handleDeleteMessage}
                onFileClick={handleFileClick}
              />
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <Footer
        onSubmit={handlePromptSubmit}
        isLoading={isLoading}
        focusTextarea={focusTextarea}
        promptInputRef={promptInputRef}
        useWebSearch={useWebSearch}
        onToggleWebSearch={handleToggleWebSearch}
        chatStatus={status}
        onStop={stop}
      />

      <ImageModal
        open={!!modalImageUrl}
        filename={modalImageUrl?.filename}
        title={modalImageUrl?.title}
        url={modalImageUrl?.url}
        onClose={closeImage}
      />

      <TextFileModal
        open={!!modalTextFile}
        filename={modalTextFile?.filename}
        content={modalTextFile?.content}
        onClose={closeText}
      />

      <PdfModal
        open={!!modalPdfFile}
        filename={modalPdfFile?.filename}
        url={modalPdfFile?.url}
        onClose={closePdf}
      />

      <DeleteMessageDialog
        open={showDeleteDialog}
        onOpenChange={handleDeleteDialogOpenChange}
        onConfirm={confirmDeleteMessage}
        onCancel={cancelDeleteMessage}
      />
    </ErrorBoundary>
  );
}
