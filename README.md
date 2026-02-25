# azure-foundry-chat

[![Build & Deploy](https://github.com/cu-cit-cloud-team/azure-foundry-chat/actions/workflows/build-and-deploy.yml/badge.svg)](https://github.com/cu-cit-cloud-team/azure-foundry-chat/actions/workflows/build-and-deploy.yml)

Private streaming chat interface powered by Azure AI Foundry with support for OpenAI GPT, OpenAI o-series, Anthropic Claude, DeepSeek, and xAI Grok models.

## About

A modern Next.js 16 chat application featuring real-time streaming responses from Azure AI Foundry. Built with the latest web technologies including React 19, AI SDK v6, and Node.js runtime.

### Privacy-Focused Design

All data stays in your browser: chat history, uploaded files, preferences, and settings are stored locally via IndexedDB and localStorage. The app connects directly to your own Azure AI Foundry endpoint with no third-party data sharing.

### Key Features

- 💬 Real-time streaming chat with multiple models
- 🔍 Optional web search with source URLs and reasoning traces for supported models
- 🧠 Reasoning support with model-specific reasoning output (including DeepSeek `<think>` segments)
- 🖼️ Image generation integrated into the chat flow (when using supported GPT models)
- 📎 File upload support (images, PDFs, text files, and code files)
- 🔒 Privacy-first: all data stored client-side in your browser
- 🎨 Light and dark themes
- 💾 Persistent chat history via IndexedDB
- 🔢 Live token counting with model-aware limits
- 📱 Responsive design

### Prerequisites

- Node.js >= 24.x (npm >= 11.x recommended)
- Azure Subscription with:
  - Azure AI Foundry access
  - Deployed model(s) (GPT-4.1 series, GPT-5-mini/nano, GPT-5.1 series, GPT-5.2 series, GPT 5.3 Codex, o-series, Anthropic Claude, DeepSeek, xAI Grok)
  - API key and endpoint

## Getting Started

1. **Clone and install**

   ```bash
   git clone https://github.com/cu-cit-cloud-team/azure-foundry-chat.git
   cd azure-foundry-chat
   npm install
   ```

2. **Configure environment**

   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Azure AI Foundry credentials and deployment names
   ```

3. **Run development server**

   ```bash
   npm run dev
   # Visit http://localhost:3001
   ```

**Using DevContainer:** Open in VS Code with Dev Containers extension - dependencies install automatically.

## Configuration

This app uses Azure AI Foundry-style endpoints and a single API key for OpenAI, Anthropic, DeepSeek, and xAI Grok models. Environment variables are validated on each chat request; missing variables will cause a clear error indicating which values are required.

### Core Azure configuration

Required environment variables (see `.env.local.example` for the canonical list):

- `AZURE_FOUNDRY_ENDPOINT` – Your Azure AI Foundry endpoint, e.g.:
  - `https://your-deployment-name.services.ai.azure.com`
- `AZURE_FOUNDRY_RESOURCE_NAME` – Your Azure AI resource name (used by the SDK client)
- `AZURE_FOUNDRY_API_KEY` – API key used for all deployed models (OpenAI, Anthropic, DeepSeek)

> **Important:** Use your **deployment names**, not raw model IDs, for all `*_DEPLOYMENT` variables.
>
> For example, if you deployed a model as `my-gpt-5.2-chat`, set `AZURE_OPENAI_GPT5_CHAT_DEPLOYMENT="my-gpt-5.2-chat"`, even though the base model is `gpt-5.2-chat`.

### Azure OpenAI (GPT and o-series)

The chat route maps UI model names (e.g. `gpt-5.2`) to specific deployment environment variables via `modelDeploymentMap` in `app/api/chat/route.ts`.

Key environment variables:

- GPT-4.1 / GPT-5.x series:
  - `AZURE_OPENAI_GPT41_DEPLOYMENT`
  - `AZURE_OPENAI_GPT41_MINI_DEPLOYMENT`
  - `AZURE_OPENAI_GPT41_NANO_DEPLOYMENT`
  - `AZURE_OPENAI_GPT5_MINI_DEPLOYMENT`
  - `AZURE_OPENAI_GPT5_NANO_DEPLOYMENT`
  - `AZURE_OPENAI_GPT51_DEPLOYMENT`
  - `AZURE_OPENAI_GPT51_CHAT_DEPLOYMENT`
  - `AZURE_OPENAI_GPT51_CODEX_DEPLOYMENT`
  - `AZURE_OPENAI_GPT51_CODEX_MINI_DEPLOYMENT`
  - `AZURE_OPENAI_GPT51_CODEX_MAX_DEPLOYMENT`
  - `AZURE_OPENAI_GPT52_DEPLOYMENT`
  - `AZURE_OPENAI_GPT52_CHAT_DEPLOYMENT`
  - `AZURE_OPENAI_GPT52_CODEX_DEPLOYMENT`
  - `AZURE_OPENAI_GPT53_CODEX_DEPLOYMENT`

- o-series:
  - `AZURE_OPENAI_O3_DEPLOYMENT`
  - `AZURE_OPENAI_O3_MINI_DEPLOYMENT`
  - `AZURE_OPENAI_O4_MINI_DEPLOYMENT`

- Image generation:
  - `AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT` – Image model used for image generation inside chat (e.g. `gpt-image-1.5`).

If a model is selected in the UI but the corresponding deployment variable is not set, the API will return an error similar to:

> `No deployment configured for model: gpt-5.2. Please set the AZURE_OPENAI_GPT52_DEPLOYMENT environment variable.`

### Anthropic (Claude via Azure)

Anthropic models are accessed through Azure AI Foundry using the same key and endpoint, but with a different API path and deployment names.

- `AZURE_ANTHROPIC_API_PATH` – e.g. `/anthropic/v1/`
- `AZURE_ANTHROPIC_API_VERSION` – e.g. `2023-06-01`
- `AZURE_ANTHROPIC_CLAUDE_HAIKU_45_DEPLOYMENT` – deployment for `claude-haiku-4-5`
- `AZURE_ANTHROPIC_CLAUDE_OPUS_45_DEPLOYMENT` – deployment for `claude-opus-4-5`
- `AZURE_ANTHROPIC_CLAUDE_SONNET_45_DEPLOYMENT` – deployment for `claude-sonnet-4-5`
- `AZURE_ANTHROPIC_CLAUDE_OPUS_46_DEPLOYMENT` – deployment for `claude-opus-4-6`
- `AZURE_ANTHROPIC_CLAUDE_SONNET_46_DEPLOYMENT` – deployment for `claude-sonnet-4-6`

### DeepSeek (via Azure)

DeepSeek models are also accessed through Azure AI Foundry with their own API path:

- `AZURE_DEEPSEEK_API_PATH` – e.g. `/models/`
- `AZURE_DEEPSEEK_R1_0528_DEPLOYMENT` – deployment for `DeepSeek-R1-0528`
- `AZURE_DEEPSEEK_V31_DEPLOYMENT` – deployment for `DeepSeek-V3.1`
- `AZURE_DEEPSEEK_V32_DEPLOYMENT` – deployment for `DeepSeek-V3.2`

DeepSeek models support rich reasoning output, and this app uses AI SDK middleware to extract reasoning segments tagged with `<think>`.

### xAI Grok (via Azure)

xAI Grok models are accessed through Azure AI Foundry using your Azure Foundry OpenAI-compatible endpoint:

- `AZURE_FOUNDRY_OPENAI_COMPATIBLE_ENDPOINT` – Your Azure Foundry OpenAI-compatible endpoint, e.g. `https://your-resource-name.openai.azure.com/openai/v1/`
- `AZURE_XAI_GROK_4_DEPLOYMENT` – deployment for `grok-4`
- `AZURE_XAI_GROK_4_FAST_NON_REASONING_DEPLOYMENT` – deployment for `grok-4-fast-non-reasoning`
- `AZURE_XAI_GROK_4_FAST_REASONING_DEPLOYMENT` – deployment for `grok-4-fast-reasoning`
- `AZURE_XAI_GROK_CODE_FAST_1_DEPLOYMENT` – deployment for `grok-code-fast-1`

### Supported models

The canonical list of supported models and token limits lives in `app/utils/models.ts`. Broadly, the app supports:

- **GPT-4.1 / GPT-5.x series**: `gpt-4.1`, `gpt-4.1-mini`, `gpt-4.1-nano`, `gpt-5-mini`, `gpt-5-nano`, `gpt-5.1`, `gpt-5.1-chat`, `gpt-5.1-codex`, `gpt-5.2`, `gpt-5.2-chat`, `gpt-5.2-codex`, `gpt-5.3-codex`
- **o-series**: `o3`, `o3-mini`, `o4-mini`
- **Anthropic (Claude)**: `claude-haiku-4-5`, `claude-sonnet-4-5`, `claude-opus-4-5`, `claude-sonnet-4-6`, `claude-opus-4-6`
- **DeepSeek**: `DeepSeek-V3.1`, `DeepSeek-V3.2`, `DeepSeek-R1-0528`
- **xAI Grok**: `grok-4`, `grok-4-fast-non-reasoning`, `grok-4-fast-reasoning`, `grok-code-fast-1`

Refer to `app/utils/models.ts` and `.env.local.example` to ensure your deployments and environment variables are configured consistently.

### Upgrading from earlier versions

Several recent releases updated environment variable names and added support for Anthropic, DeepSeek, and xAI Grok models. If you are upgrading from an earlier beta:

1. Copy the latest example file:

   ```bash
   cp .env.local.example .env.local
   ```

2. Copy your existing values into the new `.env.local`, paying attention to renamed or newly added variables.

3. Restart the dev server; if any required variables are missing, the chat API will log and return a clear error listing them.

## API & Architecture

The main chat endpoint lives at `app/api/chat/route.ts` and is implemented using the Vercel AI SDK v6.

- Uses `streamText` with `smoothStream()` for real-time streaming responses.
- Converts UI messages via `convertToModelMessages`.
- Streams responses back to the frontend using `toUIMessageStreamResponse`.
- Attaches message metadata (model name, timestamp) and usage metadata (`totalUsage`) per response.
- Routes models to providers via:
  - `createAzure` for OpenAI (GPT and o-series)
  - `createAnthropic` for Claude models
  - `createDeepSeek` wrapped with `extractReasoningMiddleware` for DeepSeek models
  - `createXai` for xAI Grok models

Health check endpoint at `app/api/health/route.ts` verifies connectivity to the Azure AI Foundry endpoint and validates that the configured deployments are accessible.

> **Runtime:** APIs currently uses the **Node.js runtime** (`export const runtime = 'nodejs'`), not the Edge runtime.

### Error behavior

The API converts low-level errors to user-friendly messages:

- Missing deployment / misconfigured model → "Model deployment not found. Please contact your administrator."
- Quota issues → "API quota exceeded. Please try again later."
- Authentication issues → "Authentication failed. Please contact your administrator."
- Any other unexpected error → "An error occurred processing your request. Please try again."

Full error details are logged server-side with model name and timestamp for easier debugging.

## Features

### Chat Interface

- Real-time streaming responses with smooth token delivery
- Multi-line input with auto-resize textarea
- Markdown rendering with syntax highlighting for code blocks
- LaTeX math equation support
- Copy messages and code snippets to clipboard
- Model selection with automatic token limit adjustment
- Display of reasoning traces and tool calls when provided by the model
- Support for web search results, including source URLs and citations

### Web Search & Sources

When the "web search" option is enabled in the UI, the backend:

- Uses `azure.tools.webSearchPreview` to perform web search with a medium context size.
- Streams back responses enriched with:
  - Source URLs and metadata
  - Tool call information and reasoning (where available)
- The Messages UI renders sources and citations alongside the AI response.

### Image & File Support

- Attach images, PDFs, and text-based/code files:
  - PNG (.png)
  - JPG (.jpg, .jpeg)
  - WEBP (.webp)
  - PDF (.pdf)
  - Text (.txt, .csv, .tsv)
  - Markdown (.md)
  - HTML (.html, .htm)
  - YAML (.yaml, .yml)
  - XML (.xml)
  - JSON (.json, .jsonc)
  - TypeScript (.ts, .tsx)
  - JavaScript (.js, .jsx)
  - CSS (.css)
  - Sass (.sass, .scss)
  - Shell (.sh)
  - Golang (.go)
  - Java (.java)
  - PHP (.php)
  - Ruby (.rb)
  - Python (.py)
- Up to 3 files per message (25MB each)
- Inline preview and modal display for images, PDFs, and text files
- Image generation:
  - Available for supported GPT models (e.g. GPT-4.1 / GPT-5.x series) when `AZURE_OPENAI_GPT_IMAGE_DEPLOYMENT` is configured.
  - Generated images appear directly in the conversation, similar to user attachments.

### Customization

- Light/dark theme toggle
- Custom system prompts
- Model selection with automatic token limit adjustment
- Adjustable model parameters (temperature, top_p, penalties) for models that support them

### Message Management

- Delete individual messages
- Regenerate last response
- Stop ongoing responses
- Export chat history to JSON (includes attachments)
- Import chat history from JSON (includes attachments; overwrites current chat when confirmed)
- Clear all messages

### Import / Export

- **Location:** Header menu actions include Import (JSON upload) and Export (JSON download).
- **Behavior:** Import will overwrite the current chat; when the chat is empty it auto-imports, otherwise a confirmation dialog is shown.
- **Attachments:** File parts (images, PDFs, text files) are preserved inline in the JSON export and restored on import.
- **System message:** The exported file includes the system prompt; importing restores it automatically.

### Privacy & Data

- All chat history stored locally in your browser (IndexedDB)
- File attachments stored client-side only (IndexedDB)
- User preferences persisted in localStorage
- Direct connection to your Azure AI Foundry endpoint
- No third-party data sharing or external logging

## Development

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # Run ESLint
npm run biome        # Run Biome linter
```

The project uses:

- **React Compiler** is enabled for automatic optimizations (no manual memoization needed except at component boundaries)
- **Conventional Commits** for changelog generation
- **GitHub Actions** for CI/CD to Azure App Service

## Built With

### Frontend

- [Next.js 16](https://nextjs.org/) - React framework with App Router
- [React 19](https://react.dev/) - UI library with React Compiler
- [Vercel AI SDK v6](https://sdk.vercel.ai/) - AI streaming primitives
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first CSS
- [shadcn/ui](https://ui.shadcn.com/) - Component library built on Radix UI
- [AI Elements](https://ui.shadcn.com/docs/components/ai-elements) - Chat UI primitives (Conversation, Message, PromptInput)
  - [Streamdown](https://github.com/vercel-labs/streamdown) - Markdown and code rendering with syntax highlighting

### State & Data

- [Jotai](https://jotai.org/) - Atomic state management
- [Dexie](https://dexie.org/) - IndexedDB wrapper for chat persistence

### Backend & Hosting

- [Azure AI Foundry](https://azure.microsoft.com/en-us/products/ai-foundry/) - Model deployments
- [Azure App Service](https://azure.microsoft.com/en-us/products/app-service/) - Hosting & authentication
