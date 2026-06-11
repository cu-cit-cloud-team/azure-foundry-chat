import { useCallback, useState } from 'react';

import type { MessageFileAttachment } from '@/app/types';

export type ModalImage = {
  url: string;
  filename: string;
  title?: string;
} | null;
export type ModalTextFile = {
  content: string;
  filename: string;
  mediaType: string;
} | null;
export type ModalPdf = { url: string; filename: string } | null;

export const useMessageModals = () => {
  const [modalImageUrl, setModalImageUrl] = useState<ModalImage>(null);
  const [modalTextFile, setModalTextFile] = useState<ModalTextFile>(null);
  const [modalPdfFile, setModalPdfFile] = useState<ModalPdf>(null);

  const handleFileClick = useCallback((file: MessageFileAttachment) => {
    const filename = file.filename || 'attachment';

    if (file.mediaType.startsWith('image/')) {
      setModalImageUrl({
        url: file.url || '',
        filename,
        title: file.title,
      });
    } else if (file.mediaType === 'application/pdf') {
      setModalPdfFile({
        url: file.url || '',
        filename,
      });
    } else if (file.textContent) {
      setModalTextFile({
        content: file.textContent,
        filename,
        mediaType: file.mediaType,
      });
    }
  }, []);

  const closeImage = useCallback(() => setModalImageUrl(null), []);
  const closeText = useCallback(() => setModalTextFile(null), []);
  const closePdf = useCallback(() => setModalPdfFile(null), []);

  return {
    modalImageUrl,
    modalTextFile,
    modalPdfFile,
    handleFileClick,
    closeImage,
    closeText,
    closePdf,
  } as const;
};
