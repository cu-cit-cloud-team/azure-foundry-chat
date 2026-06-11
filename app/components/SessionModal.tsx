import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';

export const SessionModal = () => {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
      <Alert variant='destructive' className='w-11/12 max-w-lg'>
        <AlertDescription className='space-y-4'>
          <h3 className='text-lg font-bold'>Warning</h3>
          <p>Your session has expired.</p>
          <Button
            variant='destructive'
            onClick={() => {
              window.location.reload();
            }}
          >
            Refresh your session
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default SessionModal;

SessionModal.displayName = 'SessionModal';
