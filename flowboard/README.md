<p align="center">
  <img src="public/logo.png" alt="FlowBoard" width="64" height="64" />
</p>

<h1 align="center">FlowBoard</h1>

<p align="center">
  <strong>Production-Grade Kanban Project Management Platform</strong><br/>
  Built with Next.js 15 · Neon PostgreSQL · Pragmatic Drag-and-Drop · React Query
</p>

<p align="center">
  <a href="https://rtnban.denizbuyuksahin.com">🌐 Live Demo</a> ·
  <a href="#tech-stack">Tech Stack</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#features">Features</a> ·
  <a href="#getting-started">Getting Started</a>
</p>

---

## 📖 Origin Story

FlowBoard started as a **GenAI coding assessment** assigned by [KoçSistem](https://www.kocsistem.com.tr/) — one of Turkey's leading technology companies. The challenge: build a fully functional Kanban board from scratch to demonstrate modern full-stack engineering competence.

**But I didn't stop at "passing the test."**

I saw the potential to turn this into a real tool. Within the same week, I deployed FlowBoard to a **Hetzner VPS**, configured it under the custom domain **[rtnban.denizbuyuksahin.com](https://rtnban.denizbuyuksahin.com)**, and started using it at **RTN House** — the company where I currently work — as our daily project management tool.

Today, FlowBoard powers the entire task tracking workflow of RTN House. Every sprint planning, task assignment, and progress tracking happens on this board. It's not a demo — it's production software with real users.

---

## 🏗️ Tech Stack

Every library was chosen deliberately. Here's what powers FlowBoard and **why**:

| Layer | Technology | Why This Choice |
|-------|-----------|----------------|
| **Framework** | Next.js 15.1.3 (App Router) | Server Actions, React Server Components, `standalone` output for Docker |
| **Runtime** | React 19 + TypeScript | Latest concurrent features, strict type safety end-to-end |
| **Database** | Neon (Serverless PostgreSQL) | Branching, serverless scale-to-zero, native `postgres.js` driver |
| **DB Driver** | `postgres` (postgres.js) | Zero-dependency, tagged template queries (SQL injection safe), 10× lighter than Prisma |
| **Auth** | NextAuth.js v5 (Auth.js) | Credentials provider with bcrypt, JWT sessions, middleware-level route protection |
| **Drag & Drop** | `@atlaskit/pragmatic-drag-and-drop` | Atlassian's production DnD engine — accessible, touch-friendly, framework-agnostic |
| **State** | TanStack React Query v5 | Optimistic updates, cache invalidation, background refetching |
| **Ordering** | `fractional-indexing` | O(1) reorder operations — no renumbering of siblings |
| **Rich Text** | Tiptap (ProseMirror) | Headless rich-text editor for task descriptions |
| **File Storage** | Cloudflare R2 (S3-compatible) | Zero-egress-fee object storage for comment attachments |
| **AI Assistant** | Google Gemini 2.0 Flash Lite | Function-calling capable LLM for the KAI chatbot |
| **Styling** | Vanilla CSS + CSS Custom Properties | Full theming system (Paper/Cool/Dark), no utility class bloat |
| **Deployment** | Docker → Hetzner VPS (Coolify) | Multi-stage Alpine build, `standalone` output, ~150MB image |

---

## 🏛️ Architecture

### Project Structure

```
flowboard/
├── app/                        # Next.js App Router
│   ├── (auth)/login/           # Authentication pages
│   ├── board/[id]/             # Kanban board (main view)
│   │   ├── KanbanBoard.tsx     # Core drag-and-drop engine
│   │   └── CardModal.tsx       # Task detail modal (1400+ lines)
│   ├── timeline/               # Gantt-style project timeline
│   ├── list/                   # Cross-board card list view
│   ├── leaderboard/            # Story-points leaderboard
│   └── api/kai/                # KAI AI assistant endpoint
├── components/                 # Shared UI primitives
│   ├── ui.tsx                  # Design system (Button, Avatar, Chip, Menu…)
│   ├── TweaksPanel.tsx         # Theme customization panel
│   └── TweaksProvider.tsx      # Theme context (accent, density, background)
├── hooks/                      # React Query mutation/query hooks
│   ├── useBoard.ts             # Board CRUD + optimistic updates
│   └── useCard.ts              # Card detail, checklist, comments
├── lib/                        # Server-side logic
│   ├── mutations.ts            # All write operations (Server Actions)
│   ├── queries.ts              # All read operations (Server Actions)
│   ├── ordering.ts             # Fractional indexing utilities
│   ├── auth.ts                 # NextAuth configuration
│   ├── db.ts                   # Neon connection
│   └── r2.ts                   # Cloudflare R2 upload logic
├── types/                      # TypeScript definitions
│   ├── database.ts             # DB row types, enums
│   └── domain.ts               # Hydrated domain models (Card, Board…)
├── neon/
│   └── schema.sql              # Complete database schema
├── Dockerfile                  # Multi-stage production build
└── next.config.ts              # Standalone output + transpile config
```

### Data Model

The relational model follows a strict hierarchy with referential integrity enforced at the database level:

```
┌─────────┐    ┌──────────────┐    ┌─────────┐    ┌─────────┐
│  users  │───▶│   profiles   │───▶│ boards  │───▶│ columns │
└─────────┘    └──────────────┘    └─────────┘    └─────────┘
                     │                   │              │
                     │              ┌────┴────┐    ┌────┴────┐
                     │              │ labels  │    │  cards  │
                     │              └─────────┘    └─────────┘
                     │                   │              │
                     │              card_labels    ┌────┴────────┐
                     │              (m2m)          │             │
                     ├──── card_assignees (m2m)    │  checklist  │
                     ├──── card_watchers  (m2m)    │   items     │
                     └──── board_members  (m2m)    └─────────────┘
                                                        │
                                                   ┌────┴────┐
                                                   │comments │
                                                   └─────────┘
                                                        │
                                                   ┌────┴──────────┐
                                                   │  comment      │
                                                   │  attachments  │
                                                   └───────────────┘
```

**Key Design Decisions:**
- **UUIDs everywhere** — `uuid_generate_v4()` for all primary keys, no integer sequences
- **Cascade deletes** — deleting a board removes all children (columns → cards → checklists → comments)
- **Position as TEXT** — fractional indexing keys stored as lexicographically sortable strings
- **Trigger-based membership** — `trg_board_owner_member` automatically adds the creator as board owner
- **Enum types** — `board_role` (`owner` / `editor` / `viewer`) and `card_priority` (`low` / `med` / `high`) enforced at DB level
- **Sprint archiving** — `sprint_archived_cards` stores denormalized snapshots (assignee names, label colors, story points) so historical data survives even after card deletion

---

## 🎯 Features

### Kanban Board Engine
- **Drag-and-drop** cards between columns, reorder within columns, reorder columns themselves
- **Visual drop indicators** — edge-closest algorithm highlights exactly where the card will land
- **Optimistic UI** — board updates instantly on drag; server persists asynchronously
- **Fractional indexing** — moving a card between positions A and B generates a new position key between them without touching any other row

### Task Management
- **Rich text descriptions** via Tiptap editor (bold, italic, lists, code blocks)
- **Priority levels** — Low / Medium / High with color-coded badges
- **Start & due dates** with smart overdue/soon indicators
- **Labels** — custom board-level labels with color coding
- **Assignees & Watchers** — assign team members, add watchers for notifications
- **Checklists** — progress-tracked sub-tasks with visual progress bar
- **Comments** with image attachments (uploaded to Cloudflare R2)
- **Story points** — effort estimation per card
- **Activity log** — full audit trail per card (who changed what, when)

### Multiple Views
- **Board View** — classic Kanban columns with drag-and-drop
- **List View** — all cards across all boards in a filterable/sortable table
- **Timeline View** — Gantt-style visualization of boards and sprints
- **Leaderboard** — story-points ranking across team members

### Sprint Management
- **Start/complete sprints** with goal tracking
- **Sprint archives** — completed sprint snapshots with denormalized card data
- **Sprint completion validation** — all tasks must be in "Done" before closing

### KAI — AI Assistant
- Powered by **Google Gemini 2.0 Flash Lite** with function-calling
- Context-aware: knows your boards, columns, and current board context
- Can **create tasks**, **list boards/columns/tasks** via natural language
- Accessible from a floating chat widget on every page

### Theme Customization (Tweaks)
- **5 accent colors** — Indigo, Amber, Forest, Rose, Ink
- **2 density modes** — Comfortable and Compact
- **3 backgrounds** — Paper (light), Cool (neutral), Dark (dark mode)
- Persisted in `localStorage`, applied via CSS custom properties
- Available on both login screen and main application

### Authentication & Security
- **NextAuth.js v5** with Credentials provider
- **bcrypt** password hashing (salt rounds = 10)
- **Middleware-level route protection** — unauthenticated users redirected to `/login`
- **Server Actions** — all mutations verify session before execution
- **Admin role** — certain operations (board management, sprint control) restricted to admins

### Mobile Responsiveness
- Touch-friendly drag-and-drop (Pragmatic DnD has native touch support)
- Responsive CSS breakpoints for card modals, sidebar, and board layout
- Horizontal-scroll Kanban on narrow viewports
- Compact card rendering on mobile

---

## ⚙️ Drag-and-Drop Deep Dive

The DnD implementation is the heart of FlowBoard. Here's how it achieves reliability:

### 1. Library Choice: Pragmatic Drag-and-Drop

Atlassian's `@atlaskit/pragmatic-drag-and-drop` was chosen over alternatives (react-beautiful-dnd, dnd-kit) because:
- **Production-proven** at Atlassian's scale (Jira, Trello)
- **Framework-agnostic** — works with raw DOM, no React context wrappers
- **Touch-first** — native mobile support without polyfills
- **Accessible** — keyboard DnD built-in
- **Tiny bundle** — ~4.7 kB gzipped

### 2. Drop Indicator Algorithm

```typescript
// KanbanBoard.tsx — extractClosestEdge determines top/bottom placement
const closestEdge = extractClosestEdge(self.data);
// Visual indicator rendered at the exact edge
<DropIndicator edge={closestEdge} />
```

The `closestEdge` algorithm calculates whether the dragged item is closer to the **top** or **bottom** edge of the target card, providing pixel-accurate visual feedback.

### 3. Fractional Indexing

Instead of integer positions (which require renumbering on every insert), FlowBoard uses **lexicographic fractional keys**:

```
Card A: position = "a0"
Card B: position = "a1"
Card C: position = "a2"

// Insert between A and B:
New card: position = "a0V"  ← generated by fractional-indexing

// Database: UPDATE cards SET position = 'a0V' WHERE id = $newCard
// Only 1 row touched. No renumbering.
```

This means:
- **O(1) reorder** — only the moved card's row is updated
- **Survives refresh** — positions are persisted in PostgreSQL
- **Native sorting** — `ORDER BY position COLLATE "C"` works directly
- **Concurrent safety** — even if two users insert at the same spot, the worst case is a visual flicker until the next refetch

### 4. Optimistic Updates

```typescript
// useBoard.ts — onMutate fires BEFORE the server responds
onMutate: async ({ cardId, toColumnId, toIndex }) => {
  await qc.cancelQueries({ queryKey: key(boardId) });
  const prev = qc.getQueryData<BoardDetail>(key(boardId));
  
  // Immediately update the cache (UI moves the card instantly)
  qc.setQueryData<BoardDetail>(key(boardId), (old) => {
    // ... reorder cards in cache
  });
  
  return { prev }; // saved for rollback
},
onError: (_err, _vars, context) => {
  // Rollback to previous state on failure
  qc.setQueryData(key(boardId), context?.prev);
},
```

The result: **zero-latency drag-and-drop**. The card moves immediately; the server confirms in the background. On failure, the cache rolls back seamlessly.

---

## 🚀 Production Deployment

### Infrastructure

```
┌─────────────────────────────────────────────────┐
│                  Hetzner VPS                     │
│  ┌───────────┐   ┌──────────────────────────┐   │
│  │  Coolify   │──▶│  Docker Container        │   │
│  │ (reverse   │   │  ┌────────────────────┐  │   │
│  │  proxy +   │   │  │  node server.js    │  │   │
│  │  SSL)      │   │  │  (Next.js          │  │   │
│  └───────────┘   │  │   standalone)       │  │   │
│                   │  └────────────────────┘  │   │
│                   └──────────────────────────┘   │
└─────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
  rtnban.denizbuyuksahin.com    Neon PostgreSQL
  (SSL via Coolify/Let's Encrypt) (Serverless)
```

### Docker Build

The `Dockerfile` uses a **3-stage Alpine build** for minimal image size (~150 MB):

1. **deps** — `npm ci` installs dependencies
2. **builder** — `npm run build` creates the `standalone` output
3. **runner** — copies only `standalone` + `static` + `public` (no `node_modules`)

```dockerfile
FROM node:20-alpine AS base
# ... deps stage, builder stage ...
FROM base AS runner
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
```

### Domain & SSL
- **Domain**: `rtnban.denizbuyuksahin.com` — configured via DNS A record to Hetzner VPS
- **SSL**: Auto-provisioned via Coolify's built-in Let's Encrypt integration
- **NEXTAUTH_URL**: Set to `https://rtnban.denizbuyuksahin.com` to prevent localhost redirects

---

## 🛠️ Getting Started

### Prerequisites

- Node.js 20+
- A [Neon](https://neon.tech) PostgreSQL database
- (Optional) Cloudflare R2 bucket for attachments
- (Optional) Google Gemini API key for KAI chatbot

### 1. Clone & Install

```bash
git clone <repository-url>
cd flowboard
npm install
```

### 2. Environment Variables

Copy `.env.example` to `.env.local` and fill in the values:

```env
# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require

# Authentication
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000
AUTH_TRUST_HOST=true

# Cloudflare R2 (optional — for comment attachments)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Google Gemini (optional — for KAI chatbot)
GEMINI_API_KEY=
```

### 3. Initialize Database

Run the schema against your Neon database:

```bash
psql $DATABASE_URL -f neon/schema.sql
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Production Build

```bash
# Docker
docker build -t flowboard .
docker run -p 3000:3000 --env-file .env.local flowboard

# Or standalone
npm run build
node .next/standalone/server.js
```

---

## 📐 Code Quality & Architectural Consistency

### Separation of Concerns

| Concern | Location | Pattern |
|---------|----------|---------|
| **Database reads** | `lib/queries.ts` | Server Actions, session-verified |
| **Database writes** | `lib/mutations.ts` | Server Actions, role-checked (`requireUser` / `requireAdmin`) |
| **Client state** | `hooks/useBoard.ts`, `hooks/useCard.ts` | React Query with optimistic updates |
| **UI components** | `components/ui.tsx` | Headless primitives (Button, Avatar, Menu, Chip) |
| **Theming** | `components/TweaksProvider.tsx` | CSS custom properties via React context |
| **Type safety** | `types/database.ts`, `types/domain.ts` | Separate DB row types vs. hydrated domain models |

### Type System

The codebase maintains a clear boundary between **database types** and **domain types**:

```typescript
// types/database.ts — mirrors DB rows exactly
interface DbCard {
  id: string;
  column_id: string;
  position: string;
  // ...
}

// types/domain.ts — hydrated with joins for UI consumption
interface Card extends DbCard {
  labels: string[];           // label IDs
  assignees: string[];        // user IDs
  checklist_count: number;    // aggregated from checklist_items
  comment_count: number;      // aggregated from comments
}
```

### Server-Side Security

Every mutation follows the same pattern:

```typescript
async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Not authenticated");
  return session.user.id;
}

async function requireAdmin() {
  const userId = await requireUser();
  const rows = await db`SELECT is_admin FROM profiles WHERE id = ${userId}`;
  if (!rows[0]?.is_admin) throw new Error("Admin yetkisi gerekli");
  return userId;
}
```

No mutation touches the database without first verifying the session.

---

## 📱 Mobile Usability

FlowBoard is fully functional on mobile devices:

- **Touch DnD** — Pragmatic DnD supports touch events natively (long-press to drag)
- **Responsive modals** — `CardModal` switches to full-screen single-column layout on narrow viewports
- **Horizontal scroll** — Board columns scroll horizontally on mobile with `-webkit-overflow-scrolling: touch`
- **Compact cards** — Priority badges, avatars, and metadata stack vertically on small screens
- **Touch-optimized buttons** — minimum 44×44px touch targets on interactive elements

CSS breakpoints ensure consistent experience:

```css
@media (max-width: 700px) {
  .card-modal-body { grid-template-columns: 1fr !important; }
  .card-modal-aside { border-left: none !important; border-top: 1px solid var(--line) !important; }
}

@media (max-width: 600px) {
  .board-columns { gap: 10px; }
  .board-column { min-width: 260px; }
}
```

---

## 🗃️ Database Schema Overview

| Table | Purpose | Key Relationships |
|-------|---------|-------------------|
| `users` | Authentication credentials | PK: `id` (UUID) |
| `profiles` | Display info (name, initials, color) | FK → `users.id` |
| `boards` | Project containers | FK → `profiles.id` (owner) |
| `board_members` | Access control (owner/editor/viewer) | Composite PK: `(board_id, user_id)` |
| `columns` | Kanban columns with position | FK → `boards.id` |
| `cards` | Tasks with priority, dates, description | FK → `columns.id`, `boards.id` |
| `labels` | Board-scoped color labels | FK → `boards.id` |
| `card_labels` | Many-to-many card↔label | Composite PK |
| `card_assignees` | Many-to-many card↔user | Composite PK |
| `card_watchers` | Many-to-many card↔user | Composite PK |
| `checklist_items` | Sub-tasks with done state | FK → `cards.id` |
| `comments` | Card comments | FK → `cards.id`, `profiles.id` |
| `comment_attachments` | R2-stored file metadata | FK → `comments.id` |
| `activities` | Full audit trail | FK → `boards.id`, `cards.id` |
| `sprints` | Sprint lifecycle tracking | FK → `boards.id` |
| `sprint_archived_cards` | Denormalized sprint snapshots | FK → `sprints.id` |

---

## 🤝 RTN House — Real-World Usage

FlowBoard isn't a portfolio project. It's the production tool I deployed for **RTN House** to manage our daily work:

- **🔗 Live at**: [rtnban.denizbuyuksahin.com](https://rtnban.denizbuyuksahin.com)
- **🖥️ Hosted on**: Hetzner Cloud VPS (Falkenstein, Germany)
- **🐳 Deployed via**: Coolify (self-hosted PaaS) with Docker
- **🔒 SSL**: Auto-renewed Let's Encrypt certificates
- **📊 Database**: Neon PostgreSQL (serverless, auto-scaling)

The team uses FlowBoard daily for:
- Sprint planning and task decomposition
- Tracking task progress across columns
- Story point estimation and velocity tracking
- File attachments on task comments for design reviews
- AI-assisted task creation via KAI chatbot

---

## 📝 License

This project was developed as part of a KoçSistem GenAI assessment and subsequently adapted for production use at RTN House.

---

<p align="center">
  <sub>Built with ❤️ by <a href="https://denizbuyuksahin.com">Deniz Büyüksahin</a></sub>
</p>
