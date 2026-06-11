import { useAtomValue } from 'jotai';
import { Download } from 'lucide-react';
import { memo, useCallback, useState } from 'react';

import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { Button } from '@/app/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { database } from '@/app/database/database.config';
import { systemMessageAtom, userMetaAtom } from '@/app/utils/atoms';

interface ExportChatButtonProps {
  isLoading: boolean;
}

export const ExportChatButton = memo(({ isLoading }: ExportChatButtonProps) => {
  const systemMessage = useAtomValue(systemMessageAtom);
  const userMeta = useAtomValue(userMetaAtom);
  const chatId = userMeta?.email ? `${btoa(userMeta?.email)}-chat` : 'local-chat';
  const [showDialog, setShowDialog] = useState(false);

  const downloadFile = useCallback(
    ({
      data,
      fileName = `chat-history-${new Date().toISOString()}.json`,
      fileType = 'text/json',
    }: {
      data: string;
      fileName?: string;
      fileType?: string;
    }) => {
      const blob = new Blob([data], { type: fileType });
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = fileName;
      const clickEvent = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: false,
      });
      link.dispatchEvent(clickEvent);
      URL.revokeObjectURL(link.href);
    },
    []
  );

  const getMessages = useCallback(async () => {
    const messages = await database.messages
      .where('chatId')
      .equals(chatId)
      .toArray();
    const sortedMessages = messages
      .sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
      .map((message) => message);
    // Add system message at the beginning for export
    const messagesWithSystem = [
      {
        id: 'system',
        role: 'system' as const,
        parts: [{ type: 'text' as const, text: systemMessage }],
        createdAt: new Date().toISOString(),
        model: 'system',
      },
      ...sortedMessages,
    ];
    return JSON.stringify(messagesWithSystem, null, 2);
  }, [systemMessage, chatId]);

  const handleExportConfirm = useCallback(async () => {
    const data = await getMessages();
    downloadFile({ data });
    setShowDialog(false);
  }, [getMessages, downloadFile]);

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type='button'
              variant='ghost'
              size='icon'
              onClick={() => setShowDialog(true)}
              disabled={isLoading}
              aria-label='Export chat'
            >
              <Download className='size-5' />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Export chat</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ConfirmDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title='Download Chat History?'
        description='This will download your chat history as a JSON file.'
        confirmText='Download'
        onConfirm={handleExportConfirm}
      />
    </>
  );
});

ExportChatButton.displayName = 'ExportChatButton';

export default ExportChatButton;
