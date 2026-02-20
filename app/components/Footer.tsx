import { useAtom } from 'jotai';
import { CheckIcon, GlobeIcon, PlusIcon } from 'lucide-react';
import React, { memo, useCallback, useEffect, useState } from 'react';
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
  PromptInputAttachment,
  PromptInputAttachments,
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
  new Set(['image/*', ...Object.values(mediaTypeMap)])
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

// Component that accesses attachments context and monitors file changes
const AttachmentButton = memo(
  ({ onFilesAdded }: { onFilesAdded: () => void }) => {
    const attachments = usePromptInputAttachments();
    const prevFileCountRef = React.useRef(attachments.files.length);

    // Detect when files are added
    useEffect(() => {
      const currentCount = attachments.files.length;
      const prevCount = prevFileCountRef.current;

      // If file count increased, files were added
      if (currentCount > prevCount) {
        onFilesAdded();
      }

      prevFileCountRef.current = currentCount;
    }, [attachments.files.length, onFilesAdded]);

    return (
      <PromptInputButton onClick={attachments.openFileDialog}>
        <PlusIcon className="size-4" />
      </PromptInputButton>
    );
  }
);

AttachmentButton.displayName = 'AttachmentButton';

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
        const isStreaming =
          chatStatus === 'streaming' || chatStatus === 'submitted';

        if (isStreaming && onStop) {
          onStop();
          return;
        }

        onSubmit(message);
      },
      [chatStatus, onStop, onSubmit]
    );

    // When the form begins submitting (capture phase), show immediate feedback
    const handleSubmitCapture = useCallback(() => {
      setLocalSubmitting(true);
    }, []);

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
      <footer className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
        <div className="container max-w-5xl mx-auto px-4 py-3">
          <PromptInput
            accept={acceptedMimeTypes}
            multiple
            maxFiles={3}
            maxFileSize={25 * 1024 * 1024}
            onSubmit={handleSubmit}
            onSubmitCapture={handleSubmitCapture}
            onError={handleFileError}
          >
            <PromptInputHeader>
              <PromptInputAttachments>
                {(attachment) => <PromptInputAttachment data={attachment} />}
              </PromptInputAttachments>
            </PromptInputHeader>

            <PromptInputBody>
              <PromptInputTextarea
                ref={promptInputRef}
                placeholder={
                  isLoading
                    ? 'Loading response...'
                    : 'What would you like to know?'
                }
                disabled={isLoading}
              />
            </PromptInputBody>

            <PromptInputFooter>
              <PromptInputTools>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex" role="presentation">
                      <AttachmentButton onFilesAdded={focusTextarea} />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" align="start">
                    Add photos or files
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex" role="presentation">
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
                  <TooltipContent side="top" align="start">
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
                        <ModelSelectorLogo
                          provider={selectedModelData.provider}
                        />
                      )}
                      <ModelSelectorName>
                        {selectedModelData?.displayName ??
                          model ??
                          'Select model'}
                      </ModelSelectorName>
                    </PromptInputButton>
                  </ModelSelectorTrigger>

                  <ModelSelectorContent>
                    <ModelSelectorInput placeholder="Search models..." />
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
                                    <CheckIcon className="ml-auto size-4" />
                                  ) : (
                                    <div className="ml-auto size-4" />
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
                onClick={handleSubmitCapture}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>

        {fileError && (
          <div className="fixed bottom-20 left-0 right-0 z-50 flex justify-center px-4">
            <Alert variant="destructive" className="max-w-md">
              <AlertDescription>{fileError}</AlertDescription>
            </Alert>
          </div>
        )}

        <ConfirmDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          title="Switch Model?"
          description={`Are you sure you want to switch to ${modelStringFromName(pendingModel)}?`}
          confirmText="Continue"
          onConfirm={confirmModelChange}
          onCancel={cancelModelChange}
        />
      </footer>
    );
  }
);

Footer.displayName = 'Footer';

export default Footer;
