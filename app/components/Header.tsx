import type { UIMessage } from 'ai';
import { X } from 'lucide-react';
import { memo } from 'react';
import { ClearChatButton } from '@/app/components/ClearChatButton';
import { ExportChatButton } from '@/app/components/ExportChatButton';
import { ImportChatButton } from '@/app/components/ImportChatButton';
import { SystemMessage } from '@/app/components/SystemMessage';
import { ThemeToggle } from '@/app/components/ThemeToggle';
import { UpdateCheck } from '@/app/components/UpdateCheck';
import { UserAvatar } from '@/app/components/UserAvatar';
import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';

import pkg from '@/package.json';

interface HeaderProps {
  isLoading: boolean;
  systemMessageRef: React.RefObject<HTMLTextAreaElement | null>;
  chatError?: string | null;
  onClearError?: () => void;
  setMessages: (messages: UIMessage[]) => void;
  focusTextarea: () => void;
  messages: UIMessage[];
}

export const Header = memo(
  ({
    isLoading,
    systemMessageRef,
    chatError,
    onClearError,
    setMessages,
    focusTextarea,
    messages,
  }: HeaderProps) => {
    return (
      <>
        <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
          <div className="container flex h-14 max-w-full items-center px-4">
            {/* Left section */}
            <div className="flex items-center gap-4 flex-1">
              <a
                className="font-semibold text-sm hover:text-primary transition-colors"
                href="https://github.com/cu-cit-cloud-team/azure-foundry-chat"
                target="_blank"
                rel="noreferrer noopener"
              >
                Cloud Team Chat v{pkg.version}
              </a>
              <UpdateCheck />
            </div>

            {/* Center section - Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <SystemMessage
                isLoading={isLoading}
                systemMessageRef={systemMessageRef}
                setMessages={setMessages}
                focusTextarea={focusTextarea}
              />
              <ClearChatButton
                isLoading={isLoading}
                setMessages={setMessages}
                focusTextarea={focusTextarea}
              />
              <ImportChatButton
                isLoading={isLoading}
                setMessages={setMessages}
                focusTextarea={focusTextarea}
                messages={messages}
              />
              <ExportChatButton isLoading={isLoading} />
              <ThemeToggle />
            </div>

            {/* Right section */}
            <div className="flex items-center justify-end flex-1">
              <UserAvatar />
            </div>
          </div>
        </header>

        {/* Error banner */}
        {chatError && (
          <div className="fixed top-14 left-0 right-0 z-40 px-4 pt-2">
            <Alert variant="destructive" className="relative">
              <AlertDescription className="pr-8">{chatError}</AlertDescription>
              {onClearError && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 size-6"
                  onClick={onClearError}
                >
                  <X className="size-4" />
                </Button>
              )}
            </Alert>
          </div>
        )}
      </>
    );
  }
);

Header.displayName = 'Header';

export default Header;
