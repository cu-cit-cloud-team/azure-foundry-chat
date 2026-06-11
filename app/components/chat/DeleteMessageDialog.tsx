import { ConfirmDialog } from '@/app/components/ConfirmDialog';

export interface DeleteMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteMessageDialog = ({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
}: DeleteMessageDialogProps) => (
  <ConfirmDialog
    open={open}
    onOpenChange={onOpenChange}
    title='Delete Message?'
    description='Are you sure you want to delete this message? This action cannot be undone.'
    confirmText='Delete'
    cancelText='Cancel'
    onConfirm={onConfirm}
    onCancel={onCancel}
    variant='destructive'
  />
);
