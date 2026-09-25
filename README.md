This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Excro escrow platform (`escrow/`)

The Excro Conditional Release platform is part of this website:

- **UI:** pages under `/app` (`src/app/app/`, components in `src/components/escrow/`). The navbar's
  **Excro Login** button opens `/app`. Its styles are scoped under `.xa` so they never touch the
  rest of the site, and light/dark follows the site's toggle.
- **API:** `escrow/server`, a Fastify service with the money-safety rules, database and tests. It
  has its own `package.json` and `CLAUDE.md`; the website's TypeScript, ESLint and Tailwind skip
  `escrow/`. The `/app` pages call it through `src/app/api/escrow/[...path]/route.ts`, which relays
  to `ESCROW_API_URL`.

```bash
npm run escrow:install   # once: install the API's dependencies
npm run dev              # website on :3000 + escrow API on :8787, together
npm run dev:site         # website only (/app shows "service isn't reachable")
npm run escrow:test      # escrow API test suite
```

| Variable | Default | Purpose |
|---|---|---|
| `ESCROW_API_URL` | `http://127.0.0.1:8787` | Where `/api/escrow/*` relays to |

Deploying: the website (including `/app`) deploys to Vercel as before. The escrow API needs a
long-running server and a database (Azure Container Apps in the specs); set `ESCROW_API_URL` on
Vercel to its address.

## Light and dark mode

The sun/moon button in the navbar switches themes. The choice is saved in `localStorage`
(`excro.theme`) and applied before first paint by the inline script in `src/app/layout.tsx`.
Dark colours live at the end of `src/app/globals.css`: they re-point the surface and border
palette the components already use, so existing sections need no changes. New components can also
use Tailwind's `dark:` variant.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
