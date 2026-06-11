import type { UseChatHelpers } from '@ai-sdk/react';
import type { UIMessage } from 'ai';
import { type Dispatch, type SetStateAction, useCallback } from 'react';

import { database } from '@/app/database/database.config';

export const useRegenerateMessage = (
  messages: UIMessage[],
  setMessages: Dispatch<SetStateAction<UIMessage[]>>,
  sendMessage: UseChatHelpers<UIMessage>['sendMessage'],
  chatId?: string
) => {
  const handleRegenerateResponse = useCallback(
    async (messageId: string) => {
      try {
        const messageIndex = messages.findIndex((m) => m.id === messageId);
        if (messageIndex === -1) {
          return;
        }

        const message = messages[messageIndex];
        const isUserMessage = message.role === 'user';

        if (isUserMessage) {
          const messagesToKeep = messages.slice(0, messageIndex);
          const messageIdsToDelete = messages.slice(messageIndex).map((m) => m.id);
          if (chatId) {
            // Filter to IDs that belong to this chatId
            const toDelete: string[] = [];
            for (const id of messageIdsToDelete) {
              const msg = await database.messages.get(id);
              if (msg && msg.chatId === chatId) {
                toDelete.push(id);
              }
            }
            if (toDelete.length > 0) {
              await database.messages.bulkDelete(toDelete);
            }
          } else {
            await database.messages.bulkDelete(messageIdsToDelete);
          }
          setMessages(messagesToKeep);

          setTimeout(() => {
            if (message.parts && Array.isArray(message.parts)) {
              sendMessage({ parts: message.parts });
            }
          }, 10);
        } else {
          let lastUserIndex = -1;
          for (let i = messageIndex - 1; i >= 0; i -= 1) {
            if (messages[i].role === 'user') {
              lastUserIndex = i;
              break;
            }
          }
          if (lastUserIndex === -1) {
            return;
          }

          const messagesToKeep = messages.slice(0, lastUserIndex);
          const userMessage = messages[lastUserIndex];
          const messageIdsToDelete = messages.slice(lastUserIndex).map((m) => m.id);
          if (chatId) {
            const toDelete: string[] = [];
            for (const id of messageIdsToDelete) {
              const msg = await database.messages.get(id);
              if (msg && msg.chatId === chatId) {
                toDelete.push(id);
              }
            }
            if (toDelete.length > 0) {
              await database.messages.bulkDelete(toDelete);
            }
          } else {
            await database.messages.bulkDelete(messageIdsToDelete);
          }
          setMessages(messagesToKeep);

          setTimeout(() => {
            if (userMessage.parts && Array.isArray(userMessage.parts)) {
              sendMessage({ parts: userMessage.parts });
            }
          }, 10);
        }
      } catch (error) {
        console.error('Error regenerating response:', error);
      }
    },
    [messages, sendMessage, setMessages, chatId]
  );

  return { handleRegenerateResponse } as const;
};
