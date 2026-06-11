import { useAtom } from 'jotai';
import { CheckIcon, GlobeIcon } from 'lucide-react';
import Image from 'next/image';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import {
  Attachment,
  AttachmentHoverCard,
  AttachmentHoverCardContent,
  AttachmentHoverCardTrigger,
  AttachmentInfo,
  AttachmentPreview,
  AttachmentRemove,
  Attachments,
  getAttachmentLabel,
  getMediaCategory,
} from '@/app/components/ai-elements/attachments';
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorName,
  ModelSelectorTrigger,
} from '@/app/components/ai-elements/model-selector';
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionAddScreenshot,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from '@/app/components/ai-elements/prompt-input';
import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';
import { modelAtom } from '@/app/utils/atoms';
import { setItem } from '@/app/utils/localStorage';
import { mediaTypeMap } from '@/app/utils/messageHelpers';
import { modelFromName, modelStringFromName, models } from '@/app/utils/models';

// Dynamically generate accepted MIME types from mediaTypeMap
// Using Set to deduplicate (e.g., .jpg and .jpeg both map to image/jpeg)
const acceptedMimeTypes = Array.from(
  // new Set(['image/*', ...Object.values(mediaTypeMap)])
  new Set(...Object.values(mediaTypeMap))
).join(',');

interface FooterProps {
  onSubmit: (message: PromptInputMessage) => void;
  isLoading: boolean;
  focusTextarea: () => void;
  promptInputRef: React.RefObject<HTMLTextAreaElement | null>;
  useWebSearch: boolean;
  onToggleWebSearch: () => void;
  chatStatus?: 'ready' | 'submitted' | 'streaming' | 'error';
  onStop?: () => void;
}

const PromptInputAttachmentFocus = memo(
  ({ focusTextarea }: { focusTextarea: () => void }) => {
    const attachments = usePromptInputAttachments();
    const previousCountRef = useRef(attachments.files.length);

    useEffect(() => {
      const previousCount = previousCountRef.current;
      const currentCount = attachments.files.length;

      if (currentCount > previousCount) {
        focusTextarea();
      }

      previousCountRef.current = currentCount;
    }, [attachments.files.length, focusTextarea]);

    return null;
  }
);

PromptInputAttachmentFocus.displayName = 'PromptInputAttachmentFocus';

const PromptInputAttachmentsDisplay = memo(
  ({ focusTextarea }: { focusTextarea: () => void }) => {
    const attachments = usePromptInputAttachments();

    if (attachments.files.length === 0) {
      return null;
    }

    return (
      <Attachments variant='inline'>
        {attachments.files.map((attachment) => {
          const mediaCategory = getMediaCategory(attachment);
          const label = getAttachmentLabel(attachment);

          return (
            <AttachmentHoverCard key={attachment.id}>
              <AttachmentHoverCardTrigger asChild>
                <Attachment
                  data={attachment}
                  onRemove={() => {
                    attachments.remove(attachment.id);
                    focusTextarea();
                  }}
                >
                  <div className='relative size-5 shrink-0'>
                    <div className='absolute inset-0 transition-opacity group-hover:opacity-0'>
                      <AttachmentPreview />
                    </div>
                    <AttachmentRemove
                      className='absolute inset-0'
                      label='Remove attachment'
                    />
                  </div>
                  <AttachmentInfo />
                </Attachment>
              </AttachmentHoverCardTrigger>
              <AttachmentHoverCardContent>
                <div className='space-y-3'>
                  {mediaCategory === 'image' &&
                    attachment.type === 'file' &&
                    attachment.url && (
                      <div className='flex max-h-96 w-80 items-center justify-center overflow-hidden rounded-md border'>
                        <Image
                          alt={label}
                          className='max-h-full max-w-full object-contain'
                          height={384}
                          src={attachment.url}
                          unoptimized
                          width={320}
                        />
                      </div>
                    )}
                  <div className='space-y-1 px-0.5'>
                    <h4 className='font-semibold text-sm leading-none'>{label}</h4>
                    {attachment.mediaType && (
                      <p className='font-mono text-muted-foreground text-xs'>
                        {attachment.mediaType}
                      </p>
                    )}
                  </div>
                </div>
              </AttachmentHoverCardContent>
            </AttachmentHoverCard>
          );
        })}
      </Attachments>
    );
  }
);

PromptInputAttachmentsDisplay.displayName = 'PromptInputAttachmentsDisplay';

export const Footer = memo(
  ({
    onSubmit,
    isLoading,
    focusTextarea,
    promptInputRef,
    useWebSearch,
    onToggleWebSearch,
    chatStatus,
    onStop,
  }: FooterProps) => {
    const [localSubmitting, setLocalSubmitting] = useState(false);
    const [model, setModel] = useAtom(modelAtom);
    const [pendingModel, setPendingModel] = useState<string | null>(null);
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);
    const [fileError, setFileError] = useState<string | null>(null);
    const [modelSelectorOpen, setModelSelectorOpen] = useState(false);

    // Get current model capabilities
    const currentModel = modelFromName(model);
    const supportsWebSearch =
      currentModel?.capabilities?.includes('web-search') ?? false;
    const selectedModelData = models.find((m) => m.name === model) ?? null;

    const handleModelChange = useCallback(
      (value: string) => {
        if (value === model) {
          return;
        }

        // Always ask for confirmation before switching models
        setPendingModel(value);
        setShowConfirmDialog(true);
      },
      [model]
    );

    const confirmModelChange = useCallback(() => {
      if (pendingModel) {
        setItem('model', pendingModel);
        setModel(pendingModel);
        setShowConfirmDialog(false);
        setPendingModel(null);
        try {
          focusTextarea();
        } catch {
          // ignore focus errors
        }
        setModelSelectorOpen(false);
      }
    }, [pendingModel, setModel, focusTextarea]);

    const cancelModelChange = useCallback(() => {
      setShowConfirmDialog(false);
      setPendingModel(null);
    }, []);

    const handleFileError = useCallback((error: { message: string }) => {
      setFileError(error.message);
      // Auto-dismiss after 5 seconds
      setTimeout(() => setFileError(null), 5000);
    }, []);

    const handleSubmit = useCallback(
      (message: PromptInputMessage) => {
        const hasText = message.text.trim().length > 0;
        const hasFiles = message.files.length > 0;

        if (!(hasText || hasFiles)) {
          setLocalSubmitting(false);
          return;
        }

        setLocalSubmitting(true);
        onSubmit(message);
      },
      [onSubmit]
    );

    // Clear the local submitting indicator when loading starts or when chat returns to ready
    useEffect(() => {
      if (isLoading) {
        // schedule async to avoid calling setState synchronously in effect
        Promise.resolve().then(() => setLocalSubmitting(false));
      } else if (chatStatus === 'ready') {
        // Also clear when status returns to ready (e.g., after stop)
        setLocalSubmitting(false);
      }
    }, [isLoading, chatStatus]);

    return (
      <footer className='fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60'>
        <div className='container max-w-5xl mx-auto px-4 py-3'>
          <PromptInput
            accept={acceptedMimeTypes}
            multiple
            maxFiles={3}
            maxFileSize={25 * 1024 * 1024}
            onSubmit={handleSubmit}
            onError={handleFileError}
          >
            <PromptInputHeader>
              <PromptInputAttachmentFocus focusTextarea={focusTextarea} />
              <PromptInputAttachmentsDisplay focusTextarea={focusTextarea} />
            </PromptInputHeader>

            <PromptInputBody>
              <PromptInputTextarea
                ref={promptInputRef}
                placeholder={
                  isLoading ? 'Loading response...' : 'What would you like to know?'
                }
                disabled={isLoading}
              />
            </PromptInputBody>

            <PromptInputFooter>
              <PromptInputTools>
                <PromptInputActionMenu>
                  <PromptInputActionMenuTrigger />
                  <PromptInputActionMenuContent>
                    <PromptInputActionAddAttachments />
                    <PromptInputActionAddScreenshot />
                  </PromptInputActionMenuContent>
                </PromptInputActionMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className='inline-flex' role='presentation'>
                      <PromptInputButton
                        onClick={onToggleWebSearch}
                        variant={useWebSearch ? 'default' : 'ghost'}
                        disabled={!supportsWebSearch}
                      >
                        <GlobeIcon size={16} />
                        <span>Search</span>
                      </PromptInputButton>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side='top' align='start'>
                    {!supportsWebSearch
                      ? 'This model does not support web search'
                      : `${useWebSearch ? 'Disable' : 'Enable'} Web Search `}
                  </TooltipContent>
                </Tooltip>
                <ModelSelector
                  open={modelSelectorOpen}
                  onOpenChange={setModelSelectorOpen}
                >
                  <ModelSelectorTrigger asChild>
                    <PromptInputButton>
                      {selectedModelData?.provider && (
                        <ModelSelectorLogo provider={selectedModelData.provider} />
                      )}
                      <ModelSelectorName>
                        {selectedModelData?.displayName ?? model ?? 'Select model'}
                      </ModelSelectorName>
                    </PromptInputButton>
                  </ModelSelectorTrigger>

                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder='Search models...' />
                    <ModelSelectorList>
                      <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>

                      {['Anthropic', 'DeepSeek', 'OpenAI', 'xAI'].map(
                        (provider) => (
                          <ModelSelectorGroup heading={provider} key={provider}>
                            {models
                              .filter(
                                (m) =>
                                  m.provider.toLowerCase() ===
                                  provider.toLowerCase()
                              )
                              .map((m) => (
                                <ModelSelectorItem
                                  key={m.name}
                                  value={m.name}
                                  onSelect={() => {
                                    handleModelChange(m.name);
                                    setModelSelectorOpen(false);
                                  }}
                                >
                                  <ModelSelectorLogo
                                    provider={m.provider.toLowerCase()}
                                  />
                                  <ModelSelectorName>
                                    {m.displayName ?? m.name}
                                  </ModelSelectorName>

                                  {model === m.name ? (
                                    <CheckIcon className='ml-auto size-4' />
                                  ) : (
                                    <div className='ml-auto size-4' />
                                  )}
                                </ModelSelectorItem>
                              ))}
                          </ModelSelectorGroup>
                        )
                      )}
                    </ModelSelectorList>
                  </ModelSelectorContent>
                </ModelSelector>
              </PromptInputTools>

              <PromptInputSubmit
                status={localSubmitting ? 'submitted' : chatStatus}
                disabled={chatStatus === 'error'}
                onStop={onStop}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>

        {fileError && (
          <div className='fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4'>
            <Alert variant='destructive' className='max-w-md'>
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          </div>
        )}

        <ConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          title='Switch Model?'
          description={`Are you sure you want to switch to ${modelStringFromName(pendingModel)}?`}
          confirmText='Continue'
          onConfirm={confirmModelChange}
          onCancel={cancelModelChange}
        />
      </footer>
    );
  }
);

Footer.displayName = 'Footer';

export default Footer;
