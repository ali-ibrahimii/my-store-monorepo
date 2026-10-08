This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server from the monorepo root:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Prisma Client

Prisma Client is generated during install and again before the web app's dev and build commands. If you need to regenerate it manually after changing the Prisma schema, run this from the monorepo root:

```bash
pnpm db:generate
```

Client generation does not require a running database or `DATABASE_URL`. Database commands such as `pnpm db:push` still need a valid `DATABASE_URL`.

## Troubleshooting: dev-server rebuild loop

If the browser console fills with `[HMR] connected` / `[Fast Refresh] rebuilding`
pairs and the "Compiling…" indicator never goes away, you are hitting the
Next.js 16.2.x Turbopack dev-server rebuild loop
([vercel/next.js#94915](https://github.com/vercel/next.js/issues/94915),
[#77102](https://github.com/vercel/next.js/discussions/77102)) — it is **not**
a React re-rendering problem.

This repo ships two mitigations in `next.config.ts`
(`experimental.turbopackFileSystemCacheForDev: false` and
`experimental.turbopackServerFastRefresh: false`):

- the persistent dev cache no longer writes into `.next/dev/cache` continuously
  (those writes can feed back into the fs watcher and re-trigger builds);
- server Fast Refresh no longer ping-pongs HMR → RSC refetch → compile → HMR.

Trade-offs while they are disabled: slightly slower cold starts, and after
editing a **server** component you reload the page manually (client components
still hot-reload instantly). Remove the two flags once upstream ships a fix.

If a loop ever returns:

1. `rm -rf apps/web/.next` and start a single dev server (two `next dev`
   processes fighting over port/HMR look exactly like this loop);
2. make sure nothing writes into the repo while dev runs (backup/sync tools,
   `tooling/dev-db/data/` when using the sandbox DB, stray logs);
3. as a last resort run `next dev --no-server-fast-refresh`.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive tutorial to learn Next.js.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy this app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out [the Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
