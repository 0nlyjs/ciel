# Ciel

<p align="center">
  <img src="./public/ciel.svg" alt="Ciel Logo" width="120" />
</p>

> [!NOTE]
> **Live Site:** [ciel.mistjs.com](https://ciel.mistjs.com/)

Ciel is a premium, AI-powered personal assistant designed to clear cognitive noise and handle your day-to-day busywork. It integrates with your email (Gmail) and calendar (Google Calendar) to fetch, prioritize, search, and action your data in under a second using a local caching system.

## 🚀 Key Features & Core Concepts

- **Instant Productivity Dashboard:** A keyboard-driven, liquid glass dashboard theme featuring 3D dunes backgrounds powered by React Three Fiber.
- **Background Sync Engine:** Leverages Upstash QStash & Upstash Redis to orchestrate periodic, reliable background syncing of email and calendar data without blocking the main user experience.
- **Smart Email Prioritization:** Incoming emails are automatically processed, categorized, and tagged with AI-generated priority rankings and executive summaries.
- **Semantic Search Engine:** Powers lightning-fast queries across cached emails, meetings, and notes using vector embeddings stored in a PostgreSQL database via `pgvector`.
- **Context-Aware AI Chat Agent:** An embedded AI assistant capable of answering questions about your schedule and composing drafts directly using context from your emails and events.
- **Multimodal Voice Controls:** Interactive screen-reader and voice response system using Google Cloud Text-to-Speech to read summaries or drafts aloud with customizable voices.

## 🏛️ Architecture & Data Flow

1. **Authentication & Integrations:** Users sign in securely using Better Auth. They link Google accounts via Google OAuth, which stores credentials in database-managed integration records.
2. **Caching & Synchronization:** Background tasks trigger sync routines via Upstash QStash. The app queries Google and Corsair API wrappers to fetch incremental changes, updating the local `emails` and `calendar_events` tables for instant rendering.
3. **Embedding Generation:** New documents and messages are indexed into vector embeddings using the Vercel AI SDK and stored in the `search_documents` table.
4. **Actionable AI Agent:** The AI assistant uses structured tool calling to interact with search indices, generate drafts, schedule meetings, and update user preferences.

---

## 🛠️ Tech Stack & Tools

- **Framework:** Next.js 16 (App Router) & React 19
- **Styling:** TailwindCSS 4, Lucide Icons, and Three.js (React Three Fiber) for dynamic glassmorphic backgrounds.
- **Database & ORM:** Neon Database (Serverless Postgres) with Drizzle ORM.
- **Authentication:** Better Auth (with Google & Corsair OAuth adapters).
- **AI Engine:** Vercel AI SDK, OpenAI models, and Corsair MCP Layer (Gmail & Google Calendar tools).
- **Background Sync:** Upstash QStash & Upstash Redis.
- **Speech Engine:** Google Cloud Text-to-Speech & Web Speech API.

---

## 🗄️ Database Schema

Ciel uses Drizzle ORM to define the following Postgres tables:

| Table Name                                                                          | Description                                                                           | Key Columns                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `users`                                                                             | Stores basic profile information.                                                     | `id`, `email`, `name`, `image`                        |
| `session` / `account` / `verification`                                              | Better Auth tables to handle sessions, OAuth provider tokens, and email verification. | `userId`, `accessToken`, `refreshToken`               |
| `emails`                                                                            | Local cache of synced emails with AI priority tags and category labels.               | `id`, `userId`, `subject`, `body`, `read`, `priority` |
| `calendar_events`                                                                   | Local cache of synced calendar meetings and guest details.                            | `id`, `userId`, `startTime`, `endTime`, `attendees`   |
| `conversations` / `chat_messages`                                                   | Tracks user chats and AI agent messaging history.                                     | `conversationId`, `role`, `content`                   |
| `search_documents`                                                                  | Stores embeddings and content for fast semantic search.                               | `id`, `sourceType`, `embedding`, `content`            |
| `user_settings`                                                                     | Holds user preferences like sync frequency, theme, voice speed, and voice choice.     | `userId`, `theme`, `syncIntervalMinutes`, `ttsVoice`  |
| `user_integrations`                                                                 | Manages status of connected third-party providers.                                    | `userId`, `provider`, `connectedEmail`, `status`      |
| `corsair_integrations` / `corsair_accounts` / `corsair_entities` / `corsair_events` | Internal SDK tables powering background mail and calendar sync events.                | `accountId`, `payload`, `status`                      |

---

## ⚙️ Installation & Setup

### 1. Clone the repository

```bash
git clone https://github.com/0nlyjs/ciel.git
cd ciel
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory and configure the database connection, Better Auth credentials, Google client keys, Corsair variables, and OpenAI keys as outlined in `.env.example`.

### 4. Run database migrations

```bash
pnpm drizzle-kit push
```

### 5. Launch the local development server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

//Posts and video

founder intro video- https://youtu.be/5m5E89ZKvAc

Demo Video- https://youtu.be/faegirKsn84

Getting Started Video- https://x.com/mistjsx/status/2065065539870007668?s=20

weekly update post- https://x.com/mistjsx/status/2067531693926600922?s=20
