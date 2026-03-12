/**
 * Simple helpers for working with AI SDK v5 messages
 */

import type { UIMessage } from 'ai';
import type { MessageFileAttachment } from '@/app/types';

/**
 *  Mapping of common file extensions to media types
 */

export const mediaTypeMap: Record<string, string> = {
  json: 'application/json',
  pdf: 'application/pdf',
  ts: 'application/typescript',
  sh: 'application/x-sh',
  xml: 'application/xml',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  css: 'text/css',
  csv: 'text/csv',
  html: 'text/html',
  htm: 'text/html',
  js: 'text/javascript',
  md: 'text/markdown',
  txt: 'text/plain',
  go: 'text/x-golang',
  java: 'text/x-java',
  php: 'text/x-php',
  py: 'text/x-python',
  rb: 'text/x-ruby',
};

/**
 * Check if a message has any meaningful content
 * Used to prevent persisting empty messages on errors
 */
export function hasMessageContent(message: UIMessage): boolean {
  if (!message.parts || message.parts.length === 0) {
    return false;
  }

  // Check if there's any text content (excluding file prefixes)
  const hasText = message.parts.some(
    (part) => part.type === 'text' && part.text.trim() !== ''
  );

  // Check if there are any file parts
  const hasFiles = message.parts.some((part) => part.type === 'file');

  // Check if there are any other meaningful parts (reasoning, tool calls, etc.)
  const hasOtherContent = message.parts.some(
    (part) =>
      part.type === 'reasoning' ||
      part.type.startsWith('tool-') ||
      part.type === 'source-url'
  );

  return hasText || hasFiles || hasOtherContent;
}

/**
 * Extract a meaningful title from a URL for display purposes.
 * Returns the domain name or last path segment instead of the full URL.
 */
export function getSourceTitle(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname
      .split('/')
      .filter((segment) => segment.length > 0);

    if (pathSegments.length > 0) {
      // Return the last path segment (e.g., "article-name" from "/path/to/article-name")
      const lastSegment = pathSegments[pathSegments.length - 1];
      // Decode URI component and replace hyphens/underscores with spaces for readability
      return decodeURIComponent(lastSegment)
        .replace(/[-_]/g, ' ')
        .replace(/\.(html?|php|aspx?)$/i, ''); // Remove common file extensions
    }

    // Fallback to domain name
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    // If URL parsing fails, return the original URL
    return url;
  }
}

function getFileAttachmentId(messageId: string, index: number): string {
  return `${messageId}-file-${index}`;
}

function inferMediaTypeFromFilename(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();

  const attachmentMediaTypeMap: Record<string, string> = {
    ...mediaTypeMap,
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    pdf: 'application/pdf',
    png: 'image/png',
    webp: 'image/webp',
  };

  return attachmentMediaTypeMap[ext || ''] || 'text/plain';
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter(
      (part): part is { type: 'text'; text: string } =>
        part.type === 'text' && !part.text.startsWith('[File: ')
    )
    .map((part) => part.text)
    .join('');
}

export function getMessageFiles(message: UIMessage): MessageFileAttachment[] {
  const attachments: MessageFileAttachment[] = [];

  message.parts.forEach((part, index) => {
    if (part.type === 'file') {
      attachments.push({
        id: getFileAttachmentId(message.id, index),
        type: 'file',
        mediaType: part.mediaType,
        url: part.url || '',
        filename: part.filename,
      });
      return;
    }

    if (part.type === 'text' && part.text.startsWith('[File: ')) {
      const match = part.text.match(/^\[File: (.+?)\]\n([\s\S]*)$/);
      if (!match) {
        return;
      }

      const [, filename, textContent] = match;
      attachments.push({
        id: getFileAttachmentId(message.id, index),
        type: 'file',
        mediaType: inferMediaTypeFromFilename(filename),
        url: '',
        filename,
        textContent,
      });
    }
  });

  return attachments;
}
