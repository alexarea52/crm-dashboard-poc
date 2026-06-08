# crm-dashboard-poc

A lightweight CRM dashboard built with Next.js and TypeScript.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack)
- React 19
- TypeScript
- Tailwind CSS v4
- ESLint

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Type-check with `tsc --noEmit` |

## Structure

```
src/
  app/
    layout.tsx   Root layout
    page.tsx     Home page
    globals.css  Global styles (Tailwind)
```
