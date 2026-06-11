import { Download } from 'lucide-react';
import { Streamdown } from 'streamdown';

import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/app/components/ui/dialog';

export type ImageModalProps = {
  open: boolean;
  filename?: string;
  title?: string;
  url?: string;
  onClose: () => void;
};

export const ImageModal = ({
  open,
  filename,
  title,
  url,
  onClose,
}: ImageModalProps) => {
  const handleDownload = () => {
    if (!url || !filename) {
      return;
    }

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className='w-[80vw] sm:max-w-7xl'>
        <DialogTitle>{title || filename}</DialogTitle>
        {url && (
          // biome-ignore lint/performance/noImgElement: data URL from file upload
          <img
            src={url}
            alt='Attachment'
            className='w-full h-auto max-h-[80vh] object-contain rounded'
          />
        )}
        <div className='flex justify-center mt-4'>
          <Button variant='outline' size='sm' onClick={handleDownload}>
            <Download className='h-4 w-4 mr-2' />
            Download
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export type TextFileModalProps = {
  open: boolean;
  filename?: string;
  content?: string;
  onClose: () => void;
};

export const TextFileModal = ({
  open,
  filename,
  content,
  onClose,
}: TextFileModalProps) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <DialogContent className='w-[80vw] sm:max-w-7xl max-h-[90vh]'>
      <DialogTitle>{filename}</DialogTitle>
      {content && (
        <div className='overflow-auto max-h-[75vh] -mx-6 px-6'>
          <Streamdown
            mode='static'
            className='max-w-none'
            shikiTheme={['github-light', 'github-dark']}
          >
            {`\`\`\`${filename?.split('.').pop() || 'text'}\n${content}\n\`\`\``}
          </Streamdown>
        </div>
      )}
    </DialogContent>
  </Dialog>
);

export type PdfModalProps = {
  open: boolean;
  filename?: string;
  url?: string;
  onClose: () => void;
};

export const PdfModal = ({ open, filename, url, onClose }: PdfModalProps) => (
  <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
    <DialogContent className='w-[80vw] sm:max-w-7xl h-[90vh]'>
      <DialogTitle>{filename}</DialogTitle>
      {url && (
        <iframe
          src={url}
          title={filename}
          className='w-full h-[calc(90vh-8rem)] rounded border-0'
        />
      )}
    </DialogContent>
  </Dialog>
);
