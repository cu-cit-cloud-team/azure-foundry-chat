import type { UIMessage } from 'ai';
import { useAtom } from 'jotai';
import { Bot, RotateCcw, Save, X } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';

// import { TokenCount } from '@/app/components/TokenCount';
import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { Button } from '@/app/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/app/components/ui/popover';
import { Textarea } from '@/app/components/ui/textarea';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { useClearMessages } from '@/app/hooks/useClearMessages';
import { systemMessageAtom } from '@/app/utils/atoms';

interface SystemMessageProps {
  isLoading: boolean;
  systemMessageRef?: React.RefObject<HTMLTextAreaElement | null>;
  setMessages: (messages: UIMessage[]) => void;
  focusTextarea: () => void;
}

export const SystemMessage = memo(
  ({
    isLoading,
    systemMessageRef,
    setMessages,
    focusTextarea,
  }: SystemMessageProps) => {
    const [systemMessage, setSystemMessage] = useAtom(systemMessageAtom);
    const [localSystemMessage, setLocalSystemMessage] = useState('');
    const [originalSystemMessage, setOriginalSystemMessage] = useState('');
    const [open, setOpen] = useState(false);
    const [showResetDialog, setShowResetDialog] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);
    const clearMessages = useClearMessages(setMessages);

    useEffect(() => {
      setOriginalSystemMessage(systemMessage);
      setLocalSystemMessage(systemMessage);
    }, [systemMessage]);

    const handleClose = useCallback(() => {
      setLocalSystemMessage(originalSystemMessage);
      setOpen(false);
    }, [originalSystemMessage]);

    const handleReset = useCallback(() => {
      if (localSystemMessage.trim() !== originalSystemMessage.trim()) {
        setShowResetDialog(true);
      }
    }, [localSystemMessage, originalSystemMessage]);

    const confirmReset = useCallback(() => {
      setLocalSystemMessage(originalSystemMessage);
      setShowResetDialog(false);
    }, [originalSystemMessage]);

    const handleSave = useCallback(() => {
      if (localSystemMessage.trim() !== originalSystemMessage.trim()) {
        setShowSaveDialog(true);
      }
    }, [localSystemMessage, originalSystemMessage]);

    const confirmSave = useCallback(async () => {
      setSystemMessage(localSystemMessage);
      await clearMessages();
      setShowSaveDialog(false);
      setOpen(false);
      focusTextarea();
    }, [localSystemMessage, setSystemMessage, clearMessages, focusTextarea]);

    return (
      <>
        <Popover open={open} onOpenChange={setOpen}>
          <TooltipProvider>
            <Tooltip>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='icon'
                    disabled={isLoading}
                    aria-label='System message'
                  >
                    <Bot className='size-5' />
                  </Button>
                </TooltipTrigger>
              </PopoverTrigger>
              <TooltipContent>
                <p>System message</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <PopoverContent className='w-[500px] p-0' align='end'>
            <div className='space-y-4 p-4'>
              <div className='space-y-2'>
                <h4 className='font-medium leading-none'>System Message</h4>
                <p className='text-sm text-muted-foreground'>
                  Configure the AI assistant's behavior and personality
                </p>
              </div>

              <Textarea
                ref={systemMessageRef}
                value={localSystemMessage}
                onChange={(e) => setLocalSystemMessage(e.target.value)}
                className='min-h-[200px] font-mono text-sm'
                placeholder='You are a helpful AI assistant.'
              />

              {/* <TokenCount
              input={input}
              systemMessage={localSystemMessage}
              display={'systemMessage'}
              useLocalCalculation={true}
            /> */}

              <div className='flex items-center justify-end gap-2'>
                <Button variant='outline' size='sm' onClick={handleClose}>
                  <X className='size-4 mr-2' />
                  Close
                </Button>
                <Button
                  variant='destructive'
                  size='sm'
                  onClick={handleReset}
                  disabled={
                    localSystemMessage.trim() === originalSystemMessage.trim()
                  }
                >
                  <RotateCcw className='size-4 mr-2' />
                  Reset
                </Button>
                <Button
                  size='sm'
                  onClick={handleSave}
                  disabled={
                    localSystemMessage.trim() === originalSystemMessage.trim()
                  }
                >
                  <Save className='size-4 mr-2' />
                  Save
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Reset confirmation dialog */}
        <ConfirmDialog
          open={showResetDialog}
          onOpenChange={setShowResetDialog}
          title='Reset Changes?'
          description='Are you sure you want to reset your unsaved changes?'
          confirmText='Reset'
          onConfirm={confirmReset}
          variant='destructive'
        />

        {/* Save confirmation dialog */}
        <ConfirmDialog
          open={showSaveDialog}
          onOpenChange={setShowSaveDialog}
          title='Change System Message?'
          description='Are you sure you want to change the system message?\n\nNOTE: This will also clear your chat history and reload the app.'
          confirmText='Save'
          onConfirm={confirmSave}
        />
      </>
    );
  }
);

SystemMessage.displayName = 'SystemMessage';

export default SystemMessage;
