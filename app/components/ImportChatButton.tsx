import type { UIMessage } from 'ai';
import { useAtomValue, useSetAtom } from 'jotai';
import { Upload } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { Button } from '@/app/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { database, type StoredMessage } from '@/app/database/database.config';
import { useClearMessages } from '@/app/hooks/useClearMessages';
import { systemMessageAtom, userMetaAtom } from '@/app/utils/atoms';

interface ImportChatButtonProps {
  isLoading: boolean;
  setMessages: (messages: UIMessage[]) => void;
  focusTextarea: () => void;
  messages: UIMessage[];
}

interface ImportedChatFile {
  instructions?: string;
  messages: StoredMessage[];
}

function isStoredMessageLike(
  msg: unknown,
  allowSystemRole: boolean
): msg is StoredMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'id' in msg &&
    'role' in msg &&
    'parts' in msg &&
    Array.isArray(msg.parts) &&
    'createdAt' in msg &&
    'model' in msg &&
    typeof msg.id === 'string' &&
    (msg.role === 'user' ||
      msg.role === 'assistant' ||
      (allowSystemRole && msg.role === 'system')) &&
    typeof msg.createdAt === 'string' &&
    typeof msg.model === 'string'
  );
}

export const ImportChatButton = memo(
  ({ isLoading, setMessages, focusTextarea, messages }: ImportChatButtonProps) => {
    const [showDialog, setShowDialog] = useState(false);
    const [importData, setImportData] = useState<ImportedChatFile | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [shouldAutoImport, setShouldAutoImport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const userMeta = useAtomValue(userMetaAtom);
    const chatId = userMeta?.email ? `${btoa(userMeta?.email)}-chat` : 'local-chat';
    const clearMessages = useClearMessages(setMessages, chatId);
    const setSystemMessage = useSetAtom(systemMessageAtom);

    const normalizeImportedData = useCallback(
      (data: unknown): ImportedChatFile | null => {
        if (Array.isArray(data)) {
          if (!data.every((msg) => isStoredMessageLike(msg, true))) {
            return null;
          }

          const legacyInstructions = data.find((msg) => msg.role === 'system');

          return {
            instructions:
              legacyInstructions?.parts[0]?.type === 'text'
                ? legacyInstructions.parts[0].text
                : undefined,
            messages: data.filter((msg) => msg.role !== 'system'),
          };
        }

        if (typeof data !== 'object' || data === null || !('messages' in data)) {
          return null;
        }

        const candidate = data as {
          instructions?: unknown;
          messages?: unknown;
        };

        if (!Array.isArray(candidate.messages)) {
          return null;
        }

        if (!candidate.messages.every((msg) => isStoredMessageLike(msg, true))) {
          return null;
        }

        const legacyInstructions = candidate.messages.find(
          (msg) => msg.role === 'system'
        );

        return {
          instructions:
            typeof candidate.instructions === 'string' &&
            candidate.instructions.trim()
              ? candidate.instructions
              : legacyInstructions?.parts[0]?.type === 'text'
                ? legacyInstructions.parts[0].text
                : undefined,
          messages: candidate.messages.filter((msg) => msg.role !== 'system'),
        };
      },
      []
    );

    const performImport = useCallback(
      async (data: ImportedChatFile) => {
        try {
          // Clear existing messages first
          await clearMessages();

          if (data.instructions) {
            setSystemMessage(data.instructions);
          }

          const messagesToImport = data.messages;

          if (messagesToImport.length > 0) {
            // Ensure imported messages include chatId and write atomically
            // Force imported messages into the active chat
            const toWrite = messagesToImport.map((m) => ({
              ...m,
              chatId: chatId || m.chatId || 'local-chat',
            }));

            await database.transaction('rw', database.messages, async () => {
              if (chatId) {
                await database.messages.where('chatId').equals(chatId).delete();
              } else {
                await database.messages.clear();
              }
              await database.messages.bulkPut(toWrite);
            });

            setMessages(toWrite);
          }

          setImportData(null);
          setImportError(null);
          focusTextarea();
        } catch (error) {
          console.error('Failed to import messages:', error);
          setImportError(
            error instanceof Error ? error.message : 'Failed to import chat history'
          );
        }
      },
      [clearMessages, setSystemMessage, setMessages, focusTextarea, chatId]
    );

    // Auto-import when chat is empty
    useEffect(() => {
      if (shouldAutoImport && importData) {
        performImport(importData);
        setShouldAutoImport(false);
      }
    }, [shouldAutoImport, importData, performImport]);

    const handleFileSelect = useCallback(
      async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
          return;
        }

        try {
          const text = await file.text();
          const parsed = JSON.parse(text);
          const normalized = normalizeImportedData(parsed);

          if (!normalized) {
            setImportError(
              'Invalid chat history file. Please select a valid export file.'
            );
            setImportData(null);
            return;
          }

          // Sort by createdAt to ensure proper order
          const sortedMessages = normalized.messages.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          setImportData({
            instructions: normalized.instructions,
            messages: sortedMessages,
          });
          setImportError(null);

          // If chat is empty, proceed directly without confirmation
          if (messages.length === 0) {
            setShouldAutoImport(true);
          } else {
            setShowDialog(true);
          }
        } catch (error) {
          console.error('Failed to parse import file:', error);
          setImportError(
            'Failed to read chat history file. Please ensure it is a valid JSON file.'
          );
          setImportData(null);
        } finally {
          // Reset file input so the same file can be selected again
          if (fileInputRef.current) {
            fileInputRef.current.value = '';
          }
        }
      },
      [normalizeImportedData, messages?.length]
    );

    const handleImportConfirm = useCallback(async () => {
      if (!importData) {
        return;
      }

      await performImport(importData);
      setShowDialog(false);
    }, [importData, performImport]);

    const handleCancelImport = useCallback(() => {
      setShowDialog(false);
      setImportData(null);
      setImportError(null);
    }, []);

    const handleButtonClick = useCallback(() => {
      fileInputRef.current?.click();
    }, []);

    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type='button'
                variant='ghost'
                size='icon'
                onClick={handleButtonClick}
                disabled={isLoading}
                aria-label='Import chat'
              >
                <Upload className='size-5' />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Import chat</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <input
          ref={fileInputRef}
          type='file'
          accept='.json,application/json'
          onChange={handleFileSelect}
          className='hidden'
          aria-label='Select chat history file'
        />

        <ConfirmDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          title='Import Chat History?'
          description={
            importError ||
            'This will replace your current chat session with the imported chat history. Your current chat will be permanently deleted. This action cannot be undone.'
          }
          confirmText='Import'
          cancelText='Cancel'
          onConfirm={handleImportConfirm}
          onCancel={handleCancelImport}
          variant='destructive'
        />
      </>
    );
  }
);

ImportChatButton.displayName = 'ImportChatButton';

export default ImportChatButton;
