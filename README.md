# fabrix-web

User-facing web application for the [Fabrix](https://fabrix.tn) distributed 3D printing platform.

Built with **Next.js  (App Router)** · **TypeScript** · **Tailwind CSS** · **shadcn/ui**

---

## What this is

This is the frontend of the Fabrix platform. Users come here to:

- Register and log in
- Upload STL files and configure print options
- See available printers and estimated pricing
- Pay and confirm their print job
- Track their job in real time (progress, ETA, status)

It communicates with **Fabrix Central** (`fabrix-central`) via REST API and WebSocket.

---

## What is already set up

- Next.js  with App Router and TypeScript
- Tailwind CSS with dark theme (cyan accent, monospace font)
- shadcn/ui component library initialized and configured
- All dependencies installed (see below)

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `next` | Framework |
| `typescript` | Language |
| `tailwindcss` | Styling |
| `shadcn/ui` | UI component library |
| `lucide-react` | Icons |
| `@tanstack/react-query` | Data fetching & caching |
| `axios` | HTTP client for Fabrix Central API |
| `react-hook-form` | Form state management |
| `zod` + `@hookform/resolvers` | Form validation |
| `socket.io-client` | WebSocket connection for live job updates |
| `jose` | JWT decoding and verification |
| `js-cookie` | Cookie storage for auth token |
| `three` + `@react-three/fiber` + `@react-three/drei` | STL file preview (3D viewer) |
| `date-fns` | Date formatting |
| `clsx` + `tailwind-merge` | Conditional class utilities |

---

## Getting started

```bash
pnpm install
cp .env.local.example .env.local
# Fill in your values
pnpm dev
```

App runs at `http://localhost:3000`

---

## Environment variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4000   
# Fabrix Central base URL
NEXT_PUBLIC_WS_URL=ws://localhost:4000      
# Fabrix Central WebSocket URL
```

---


## Architecture

```
fabrix-web (this repo)
      │
      │  REST (axios)
      │  WebSocket
      ▼
fabrix-central (NestJS API)
```

