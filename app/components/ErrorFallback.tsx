import { type FallbackProps, getErrorMessage } from 'react-error-boundary';

import { Alert, AlertDescription } from '@/app/components/ui/alert';
import { Button } from '@/app/components/ui/button';

export const ErrorFallback = ({ error, resetErrorBoundary }: FallbackProps) => {
  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm'>
      <Alert variant='destructive' className='w-11/12 max-w-lg'>
        <AlertDescription className='space-y-4'>
          <h3 className='text-lg font-bold'>Error</h3>
          <p>{getErrorMessage(error)}</p>
          <Button
            variant='destructive'
            onClick={() => {
              resetErrorBoundary();
              window.location.reload();
            }}
          >
            Reload and try again
          </Button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

ErrorFallback.displayName = 'ErrorFallback';
