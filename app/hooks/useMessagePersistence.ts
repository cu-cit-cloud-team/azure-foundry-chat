import type { UIMessage } from 'ai';
import { useCallback, useEffect, useRef } from 'react';

import { database } from '@/app/database/database.config';
import { hasMessageContent } from '@/app/utils/messageHelpers';

/**
 * Extended UIMessage type with additional metadata we store when persisting.
 * This internal type always has model and createdAt defined.
 */
type PersistedMessage = UIMessage & {
  model: string;
  createdAt: string;
};

// External stored message shape coming from callers (e.g. page.tsx)
// where model/createdAt may be missing on older rows.
export type StoredMessage = UIMessage & {
  model?: string;
  createdAt?: string;
  chatId?: string;
};

interface UseMessagePersistenceProps {
  messages: UIMessage[];
  currentModel: string;
  savedMessages?: StoredMessage[];
  chatId?: string;
  activeTurnModel?: string;
}

export function useMessagePersistence({
  messages,
  currentModel,
  savedMessages,
  chatId = 'local-chat',
  activeTurnModel,
}: UseMessagePersistenceProps) {
  // Track which message IDs have been saved to avoid re-saving
  const savedMessageIdsRef = useRef<Set<string>>(new Set());
  // Ensure we only seed from savedMessages once
  const hasSeededFromSavedRef = useRef(false);

  // Seed tracking state from messages loaded from IndexedDB once on mount
  useEffect(() => {
    if (!savedMessages || hasSeededFromSavedRef.current) {
      return;
    }

    for (const msg of savedMessages) {
      if (msg.id) {
        savedMessageIdsRef.current.add(msg.id);
      }
    }

    hasSeededFromSavedRef.current = true;
  }, [savedMessages]);

  const addMessage = useCallback(
    async (message: PersistedMessage) => {
      if (!message.id) {
        return;
      }

      // Skip if we've already persisted this message
      if (savedMessageIdsRef.current.has(message.id)) {
        return;
      }

      // Validate message has actual content before persisting
      // This prevents empty/failed messages from being saved to IndexedDB
      if (!hasMessageContent(message)) {
        console.warn('Skipping persistence of empty message:', message.id);
        return;
      }

      // Mark as saved to prevent re-entrancy while persisting
      savedMessageIdsRef.current.add(message.id);

      try {
        await database.messages.put({
          id: message.id,
          chatId,
          role: message.role,
          parts: message.parts,
          model: message.model,
          createdAt: message.createdAt,
        });
      } catch (error) {
        // Roll back the optimistic "saved" flag on failure
        savedMessageIdsRef.current.delete(message.id);
        throw error;
      }
    },
    [chatId]
  );

  // Save new messages to IndexedDB when messages change
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }

    const lastMessage = messages[messages.length - 1];
    const isNewMessage = lastMessage?.id
      ? !savedMessageIdsRef.current.has(lastMessage.id)
      : false;

    if (!isNewMessage) {
      return;
    }

    // Save ONLY user messages here
    // Assistant messages are saved via onFinish callback in page.tsx which has access to API metadata
    if (lastMessage.role === 'user') {
      const model = activeTurnModel || currentModel;

      const storedMessage: PersistedMessage = {
        ...lastMessage,
        model,
        createdAt: new Date().toISOString(),
      };
      // Save to IndexedDB only - don't mutate useChat's internal state
      void addMessage(storedMessage);
    }
  }, [addMessage, messages, currentModel, activeTurnModel]);

  return {
    addMessage,
  };
}
