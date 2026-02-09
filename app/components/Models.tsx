'use client';

import { useAtom } from 'jotai';
import { Check, Cpu } from 'lucide-react';
import { useCallback, useState } from 'react';
import { ConfirmDialog } from '@/app/components/ConfirmDialog';
import { Button } from '@/app/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { ScrollArea } from '@/app/components/ui/scroll-area';
import { modelAtom } from '@/app/utils/atoms';
import { setItem } from '@/app/utils/localStorage';
import { models } from '@/app/utils/models';

interface ModelsProps {
  focusTextarea: () => void;
}

export const Models = ({ focusTextarea }: ModelsProps) => {
  const [model, setModel] = useAtom(modelAtom);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const handleClick = useCallback((modelName: string) => {
    setSelectedModel(modelName);
    setShowDialog(true);
  }, []);

  const handleConfirm = useCallback(() => {
    if (selectedModel) {
      setItem('model', selectedModel);
      setModel(selectedModel);
      focusTextarea();
    }
  }, [selectedModel, setModel, focusTextarea]);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="gap-2">
            <Cpu className="size-4" />
            Model
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="w-64">
          <ScrollArea className="h-100">
            {models.map((m) => (
              <DropdownMenuItem
                key={m.name}
                onClick={() => handleClick(m.name)}
                className="flex items-center justify-between cursor-pointer"
              >
                <span>{m.displayName}</span>
                {model === m.name && <Check className="size-4 text-primary" />}
              </DropdownMenuItem>
            ))}
          </ScrollArea>
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        title="Switch Model?"
        description={`Are you sure you want to switch the model to ${selectedModel}?`}
        confirmText="Switch"
        onConfirm={handleConfirm}
      />
    </>
  );
};

export default Models;
