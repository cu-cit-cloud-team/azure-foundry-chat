import type { FileUIPart as AIFileUIPart } from 'ai';

export interface UserMeta {
  email?: string;
  name?: string;
  user_id?: string;
}

export type {
  FileUIPart,
  ReasoningUIPart,
  SourceUrlUIPart,
  ToolUIPart,
} from 'ai';

export type MessageFileAttachment = AIFileUIPart & {
  id: string;
  textContent?: string;
  title?: string;
};

// Message part types
export interface TextPart {
  type: 'text';
  text: string;
}
