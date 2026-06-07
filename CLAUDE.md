# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is "亲友圈" (Relationship Circle), a mobile-first web application for managing family and relative relationships. It's a pure client-side application using local browser storage (IndexedDB via Dexie planned).

## Tech Stack

- **Framework**: Next.js 16.2.4 with Pages Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS v4 + Ant Design v6
- **Package Manager**: pnpm (preferred) or npm

@AGENTS.md

## Development Commands

```bash
# Development server
pnpm dev
# or: npm run dev

# Build for production
pnpm build
# or: npm run build

# Lint
pnpm lint
# or: npm run lint

# Start production server
pnpm start
# or: npm run start
```

## Project Structure

```
src/
├── pages/              # Next.js Pages Router
│   ├── _app.tsx       # App wrapper
│   ├── _document.tsx  # Document template
│   └── index.tsx      # Main page (亲友圈 home)
├── styles/
│   └── globals.css    # Tailwind v4 + custom theme colors
└── types/
    └── index.ts       # TypeScript interfaces (Person, Relationship)
```

## Design System

The app follows a warm family-style color palette defined in `globals.css`:

- **Primary**: `#E8A87C` (warm orange) - buttons, highlights
- **Background**: `#F5F1EB` (soft cream)
- **Card**: `#FFFFFF` (white)
- **Text Primary**: `#4A4A4A` (dark brown)
- **Text Secondary**: `#8B8B8B` (gray)
- **Accent**: `#A8C6A8` (soft green)

Ant Design theme is configured in components using `ConfigProvider` with these tokens.

## Data Models

### Person

```typescript
interface Person {
  id: string;
  name: string;
  photo?: string; // Base64 encoded
  callMe?: string; // How they call me (e.g., "侄子")
  iCall?: string; // How I call them (e.g., "叔叔")
  phone?: string;
  birthday?: string; // YYYY-MM-DD
  notes?: string;
  createdAt: number;
  updatedAt: number;
}
```

### Relationship

```typescript
interface Relationship {
  id: string;
  fromPersonId: string;
  toPersonId: string;
  relationLabel: string;
}
```

## Key Implementation Notes

1. **Mobile-first**: Design for max-width 480px, centered on larger screens
2. **Local storage**: Data persists in browser (IndexedDB/Dexie to be implemented)
3. **Export/Import**: JSON-based backup/restore functionality planned
4. **Photo handling**: Base64 encoded, circular crop via react-cropper planned

## Design Reference

See `design.md` for complete UI specifications, user flows, and feature requirements.
