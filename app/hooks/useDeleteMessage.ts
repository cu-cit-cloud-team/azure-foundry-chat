import type { UIMessage } from 'ai';
import { useCallback, useState } from 'react';

import { database } from '@/app/database/database.config';

export const useDeleteMessage = (
  setMessages: React.Dispatch<React.SetStateAction<UIMessage[]>>,
  chatId?: string
) => {
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDeleteMessage = useCallback((messageId: string) => {
    setDeleteMessageId(messageId);
    setShowDeleteDialog(true);
  }, []);

  const confirmDeleteMessage = useCallback(async () => {
    if (deleteMessageId) {
      try {
        if (chatId) {
          // Ensure the message to delete belongs to this chatId before deleting
          const msg = await database.messages.get(deleteMessageId);
          if (msg && msg.chatId === chatId) {
            await database.messages.delete(deleteMessageId);
          }
        } else {
          await database.messages.delete(deleteMessageId);
        }
        setMessages((prev) => prev.filter((m) => m.id !== deleteMessageId));
      } catch (error) {
        console.error('Failed to delete message:', error);
      }
    }
    setShowDeleteDialog(false);
    setDeleteMessageId(null);
  }, [deleteMessageId, setMessages, chatId]);

  const cancelDeleteMessage = useCallback(() => {
    setShowDeleteDialog(false);
    setDeleteMessageId(null);
  }, []);

  return {
    showDeleteDialog,
    deleteMessageId,
    handleDeleteMessage,
    confirmDeleteMessage,
    cancelDeleteMessage,
  } as const;
};
