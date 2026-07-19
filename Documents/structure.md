# RankForge Exhaustive Codebase Structure

## Overview
This document provides an exhaustive, detailed mapping of every directory, file, API endpoint, UI component, and their inferred implementation responsibilities in the RankForge repository. 

---

## 1. Root Configuration & Project Setup

- `.gitignore`: Specifies intentionally untracked files to ignore (e.g., node_modules, build outputs).
- `Caddyfile`: Configuration for the Caddy web server, likely acting as a reverse proxy for local development or production.
- `components.json`: Configuration file for `shadcn/ui`, detailing component aliases and styling preferences.
- `eslint.config.mjs`: ESLint configuration for code linting rules.
- `next.config.ts`: Next.js configuration (e.g., image domains, redirects, webpack overrides).
- `postcss.config.mjs`: PostCSS configuration, used to process Tailwind CSS.
- `tailwind.config.ts`: Tailwind CSS theme, plugins, and content path configurations.
- `tsconfig.json`: TypeScript compiler options and aliases.
- `package.json`: NPM package dependencies, project scripts, and metadata.
- `bun.lock` (in `mini-services`): Lockfile for Bun package manager.

## 2. Scripts & Automation (`.zscripts/` and root scripts)

- `start-dev.sh`: Main script to bootstrap the local development environment.
- `.zscripts/build.sh`: Script to build the Next.js application for production.
- `.zscripts/dev.sh`: Script to start the Next.js development server.
- `.zscripts/mini-services-build.sh`: Builds the separate mini-services (e.g., realtime service).
- `.zscripts/mini-services-install.sh`: Installs dependencies for mini-services.
- `.zscripts/mini-services-start.sh`: Starts the mini-services.
- `.zscripts/start.sh`: General script to start all application processes.
- `.zscripts/dev.pid`: Stores the process ID of the running development server.

## 3. Documentation (`Documents/` & `upload/`)

- `Documents/00-README-and-recommendations.md`: High-level overview and recommendations.
- `Documents/01-external-dependencies-gates-and-cost-model.md`: Analysis of 3rd party services and associated costs.
- `Documents/02-system-architecture-and-tech-stack.md`: Technical stack details and architecture diagrams.
- `Documents/03-software-requirements-specification.md`: SRS, detailing features, user roles, and functional requirements.
- `Documents/04-sprint-plan.md`: Agile sprint planning and task breakdown.
- `Documents/05-agent-build-guardrails-and-definition-of-done.md`: Guidelines for AI agents and DoD criteria.
- `worklog.md` (root): Detailed running log of development progress.
- `upload/`: Backup directory mirroring the markdown documents from `Documents/`.
- `Documents/rating.json`, `r7-rating.json`, `r7-clients-rating.json`: Sample JSON data payloads or schemas.

## 4. Database & ORM (`prisma/`)

- `prisma/schema.prisma`: The single source of truth for the database schema, defining models, relations, and enums.
- `prisma/seed.ts`: Script to populate the database with initial/dummy data for development and testing.

## 5. Mini-Services Architecture (`mini-services/`)

A separate microservice layer, seemingly built with Bun for high performance.
- `mini-services/realtime-service/index.ts`: The main entry point for the real-time WebSocket server.
- `mini-services/realtime-service/package.json` & `bun.lock`: Dependencies specific to the real-time service.

## 6. Public Assets (`public/`)

- `public/logo.svg`: The visual logo for RankForge.
- `public/robots.txt`: Directives for web crawlers.

## 7. Next.js Application Core (`src/app/`)

### Pages & Layouts
- `src/app/layout.tsx`: The root React layout, typically wrapping the app in HTML/Body tags and global providers.
- `src/app/page.tsx`: The main landing page or root view.
- `src/app/globals.css`: Global CSS imports, Tailwind directives, and CSS variables.
- `src/app/login/page.tsx`: The authentication/login view.

### API Endpoints (`src/app/api/`)
Every folder with a `route.ts` represents a REST API endpoint in the Next.js App Router.

**Approvals:**
- `api/approvals/route.ts`: GET list of approvals, POST new approval.
- `api/approvals/[id]/route.ts`: GET, PUT, DELETE a specific approval.
- `api/approvals/[id]/approve/route.ts`: POST to transition an approval to 'approved' state.
- `api/approvals/[id]/reject/route.ts`: POST to transition an approval to 'rejected' state.

**Authentication:**
- `api/auth/[...nextauth]/route.ts`: NextAuth.js catch-all route for handling OAuth callbacks, sessions, and logins.

**Build Status:**
- `api/build-status/[reqId]/route.ts`: GET the status of a specific background build or process.

**Clients & GBP (Google Business Profile):**
- `api/clients/route.ts`: GET all clients, POST to create a new client.
- `api/clients/[id]/route.ts`: GET, PUT, DELETE specific client data.
- `api/clients/[id]/audit-trail/route.ts`: GET historical changes/audit logs for a client.
- `api/clients/[id]/gbp/route.ts`: GET/PUT Google Business Profile integration data for a client.
- `api/clients/[id]/notes/route.ts`: GET/POST internal notes regarding a client.
- `api/clients/[id]/state/route.ts`: PUT/PATCH to transition a client's lifecycle state.

**Dashboard & Analytics:**
- `api/dashboard/route.ts`: GET aggregated metrics and stats for the main dashboard.

**Data Export & Import:**
- `api/export/clients/route.ts`: GET endpoint to download client data (e.g., CSV/JSON).
- `api/export/tasks/route.ts`: GET endpoint to download task data.
- `api/import/clients/route.ts`: POST endpoint to upload and parse client data.
- `api/import/tasks/route.ts`: POST endpoint to upload and parse task data.

**Leads:**
- `api/leads/route.ts`: GET/POST functionality for prospective clients (leads).

**Notifications:**
- `api/notifications/route.ts`: GET user notifications.
- `api/notifications/[id]/route.ts`: PUT/PATCH to mark a notification as read or DELETE it.

**Reports:**
- `api/reports/monthly/route.ts`: GET generated monthly performance reports.

**Settings:**
- `api/settings/route.ts`: GET/PUT application or user-level settings.

**Tasks & Subtasks:**
- `api/tasks/route.ts`: GET list of tasks, POST to create a task.
- `api/tasks/[id]/route.ts`: GET, PUT, DELETE specific task.
- `api/tasks/[id]/status/route.ts`: PATCH to update a task's status column (e.g., for Kanban).
- `api/tasks/[id]/subtasks/route.ts`: GET subtasks, POST to add a subtask.
- `api/tasks/[id]/subtasks/[subtaskId]/route.ts`: PUT/DELETE specific subtask.
- `api/tasks/[id]/subtasks/reorder/route.ts`: POST to update the order index of subtasks.

---

## 8. Feature Components (`src/components/`)

**Approvals:**
- `approvals/approvals-view.tsx`: UI for managing and reviewing pending approvals.

**Build Status:**
- `build-status/build-status-view.tsx`: UI for viewing CI/CD or internal build statuses.

**Clients:**
- `clients/clients-view.tsx`: Main data table or list view for all clients.
- `clients/client-detail-panel.tsx`: Deep-dive view showing a single client's info, GBP data, and notes.

**Command Palette:**
- `command-palette/command-palette.tsx`: Global search and command execution UI (usually triggered via Cmd+K).

**Dashboard:**
- `dashboard/dashboard-view.tsx`: Main analytics and summary UI widget container.

**Google Business Profile (GBP):**
- `gbp/gbp-intake-form.tsx`: Form UI for onboarding a client's GBP information.

**Layout:**
- `layout/header.tsx`: Top navigation bar containing user profile, notifications, etc.
- `layout/sidebar.tsx`: Left-hand navigation menu.

**Providers:**
- `providers/session-provider.tsx`: React Context provider wrapping the app for NextAuth session state.

**Reports:**
- `reports/monthly-report.tsx`: UI for displaying and downloading monthly data reports.

**Settings:**
- `settings/settings-view.tsx`: Configuration UI for user/app preferences.

**Tasks:**
- `tasks/tasks-view.tsx`: Standard list or table view for tasks.
- `tasks/task-kanban-view.tsx`: Drag-and-drop Kanban board UI for task management.

---

## 9. Reusable UI Components (`src/components/ui/`)
This directory contains 48 primitive UI components generated via `shadcn/ui`. They use Radix UI under the hood for accessibility and Tailwind for styling.
*Notable components:* `button.tsx`, `card.tsx`, `dialog.tsx`, `dropdown-menu.tsx`, `form.tsx`, `input.tsx`, `select.tsx`, `table.tsx`, `tabs.tsx`, `toast.tsx`, `sidebar.tsx` (UI primitive), etc.

---

## 10. Custom Hooks (`src/hooks/`)
- `use-mobile.ts`: Responsive design hook returning a boolean if the user is on a mobile breakpoint.
- `use-toast.ts`: Hook providing functions to trigger toast notifications in the UI.

---

## 11. Core Libraries & Utilities (`src/lib/`)
- `api.ts`: A standardized fetch wrapper/Axios instance for making frontend calls to the `api/` routes.
- `auth.ts`: NextAuth configuration, callbacks, and session extraction logic.
- `db.ts`: Singleton instance of the Prisma Client to prevent connection exhaustion in development.
- `hooks.ts`: Additional internal React hooks.
- `realtime.ts`: General real-time logic constants or setups.
- `realtime-server.ts`: Logic for the Next.js server to emit events to the Bun realtime-service.
- `store.ts`: Zustand or Redux global state management setup.
- `types.ts`: Universal TypeScript interfaces (e.g., API response types, shared model types).
- `use-realtime-events.ts`: React hook to subscribe to WebSocket events on the frontend.
- `utils.ts`: Small helper functions, primarily `cn()` for conditionally merging Tailwind classes.

---

## 12. TypeScript Types (`src/types/`)
- `next-auth.d.ts`: Module augmentation for `next-auth` to type-check custom session variables (like user ID or roles).
