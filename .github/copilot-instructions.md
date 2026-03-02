# Azure OpenAI GPT Chat - AI Agent Instructions

## Architecture

Next.js 16 App Router powered by React 19 with the React Compiler. The UI relies on shadcn/ui, AI Elements primitives, Tailwind v4, Streamdown for markdown/code rendering, AI SDK v6 streaming, and Dexie-backed IndexedDB persistence managed via Jotai atoms.

### Key Design Points

- **Streaming**: API routes use `streamText` + `smoothStream()` to forward tokens progressively.
- **Storage**: IndexedDB `messages` table (`&id, role, parts, createdAt, model`) with `useMessagePersistence` guarding duplicates. LocalStorage stores UI prefs/atoms.
- **React Compiler**: Enabled globally—avoid micro-optimizations, reserve `memo()` for component boundaries only.
- **Uploads**: Files (images, PDFs, text) stay client-side; text files are stored with `[File: name]` prefixes and non-text uploads use file parts with base64 URLs.

## Documentation & Tools

**MANDATORY:** Always fetch the latest docs before making decisions. Do not rely on internal/previous knowledge. Use these tools first on every task involving framework/library APIs:

- **ai-elements:** Try here for AI Elements/Streamdown documentation and fall back on context7.
- **shadcn:** For general documentation, component usage, variants, and styling patterns.
- **next-devtools:** For Next.js documentation, runtime diagnostics, route info, Edge Runtime guidance when applicable to Next.js work.
- **context7:** Resolve library IDs, then fetch current docs/examples for React, Next.js, shadcn/ui, AI Elements, Tailwind, Dexie, etc.
- **Web search:** Use when you cannot find documentation that covers your question.

Never assume prior knowledge is current — always re-query documentation before implementing or recommending changes.

## Best Practices for Generated Code

- Follow modern TypeScript idioms (strict typing, `readonly`, `satisfies`, `as const`, etc.).
- Prefer React 19.x primitives, hooks, and the React Compiler defaults; avoid manual memoization unless there is a measurable impact.
- Keep UI consistent with shadcn/ui + AI Elements design (use provided primitives, maintain accessibility, avoid inline styles in favor of Tailwind/utility classes).
- Cite documentation sources when making significant architectural choices.
- Mention any assumptions or missing info before generating code that might need follow-up.

## Patterns & References

### Messages (AI SDK v6)

```typescript
type StoredMessage = UIMessage & { model: string; createdAt: string };

// Text part
{ type: 'text', text: 'Hello!' }

// File part
{ type: 'file', mediaType: 'image/png', url: 'data:...', name: 'image.png' }

// Text file prefix
{ type: 'text', text: '[File: code.ts]\nconst x = 1;' }
```

Helpers: `app/utils/messageHelpers.ts` (`getMessageText`, `getMessageFiles`).

### Models

Managed in `app/utils/models.ts`. When adding a model:

1. Extend the `models` array with token limits.
2. Add the corresponding `AZURE_OPENAI_<MODEL>_DEPLOYMENT` variable to `.env.local.example`.
3. Map the model in `api/chat/route.ts` via `modelDeploymentMap`.

Supported: GPT-4.1 (and mini), GPT-5 (mini and nano), GPT-5.2 (including codex), GPT-5.3 Codex, o-series (o3/o4 and mini versions).

### Streaming API

```ts
const response = streamText({
  model: azureModel,
  messages: convertToModelMessages(uiMessages),
  experimental_transform: smoothStream(),
});

return response.toUIMessageStreamResponse({
  originalMessages: uiMessages,
  generateMessageId: () => generateId(),
  messageMetadata: ({ part }) =>
    part.type === "finish" ? { totalUsage: part.totalUsage } : undefined,
});
```

Frontend uses `useChat` with `DefaultChatTransport` for dynamic param injection.

## Important Notes

- **Runtime:** This repo’s chat API route is configured for the **Node.js runtime** (see `export const runtime = 'nodejs'` in `app/api/chat/route.ts`). Don’t apply Edge-only constraints unless a specific route opts into Edge.
- **tokensAtom**: Derived automatically—never mutate it directly.
- **TypeScript errors**: The build may ignore them (`next.config.mjs`) so fix proactively rather than relying on the compiler.
