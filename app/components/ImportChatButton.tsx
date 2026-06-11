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

export const ImportChatButton = memo(
  ({ isLoading, setMessages, focusTextarea, messages }: ImportChatButtonProps) => {
    const [showDialog, setShowDialog] = useState(false);
    const [importData, setImportData] = useState<StoredMessage[] | null>(null);
    const [importError, setImportError] = useState<string | null>(null);
    const [shouldAutoImport, setShouldAutoImport] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const userMeta = useAtomValue(userMetaAtom);
    const chatId = userMeta?.email ? `${btoa(userMeta?.email)}-chat` : 'local-chat';
    const clearMessages = useClearMessages(setMessages, chatId);
    const setSystemMessage = useSetAtom(systemMessageAtom);

    const validateImportedData = useCallback(
      (data: unknown): data is StoredMessage[] => {
        if (!Array.isArray(data)) {
          return false;
        }

        // Check that each message has required fields
        return data.every(
          (msg) =>
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
              msg.role === 'system') &&
            typeof msg.createdAt === 'string' &&
            typeof msg.model === 'string'
        );
      },
      []
    );

    const performImport = useCallback(
      async (data: StoredMessage[]) => {
        try {
          // Clear existing messages first
          await clearMessages();

          // Extract system message if present (first message with role 'system')
          const systemMsg = data.find((msg) => msg.role === 'system');
          if (systemMsg && systemMsg.parts[0]?.type === 'text') {
            setSystemMessage(systemMsg.parts[0].text);
          }

          // Filter out system messages and bulk-write the rest to database
          const messagesToImport = data.filter((msg) => msg.role !== 'system');

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

          if (!validateImportedData(parsed)) {
            setImportError(
              'Invalid chat history file. Please select a valid export file.'
            );
            setImportData(null);
            return;
          }

          // Sort by createdAt to ensure proper order
          const sortedMessages = parsed.sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          setImportData(sortedMessages);
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
      [validateImportedData, messages?.length]
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
