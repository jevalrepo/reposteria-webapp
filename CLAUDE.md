# DulceNube — Claude Code Project Guide

## Project Purpose

**DulceNube** ("Sweet Cloud") is a Spanish-language e-commerce web app for a bakery business. It provides:

- A product catalog organized by categories and subcategories
- A shopping cart with per-item dedication/customization notes
- Google OAuth user accounts with role-based access (`cliente`, `administrador`, `personal`)
- WhatsApp integration as the primary order conversion channel
- Deployed as a static site on GitHub Pages at `/reposteria-webapp/`

The main business flow is: browse catalog → add to cart → send order via WhatsApp.

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | React 19, TypeScript (strict) |
| Build | Vite 7, gh-pages |
| Styling | Tailwind CSS v4, PostCSS |
| Routing | React Router v7 — **HashRouter** |
| Backend | Supabase (Postgres + Google OAuth) |
| Optimization | React Compiler (Babel plugin) |

Dev server runs on port **5177** (fixed).

---

## Architecture Decisions

### HashRouter
All routing uses `HashRouter` (URLs like `/#/categorias`). This is intentional — GitHub Pages does not support server-side routing. Never switch to `BrowserRouter` without changing the hosting strategy.

### State Management: Context API Only
Two global contexts, no Redux or Zustand:
- **AuthContext** ([src/context/AuthContext.tsx](src/context/AuthContext.tsx)) — session, user profile, Google OAuth
- **CartContext** ([src/context/CartContext.tsx](src/context/CartContext.tsx)) — cart items, quantities, totals; persisted to `localStorage` under key `dulcenube_cart_v1`

Prefer local `useState` for UI-only state. Only lift to context when state is truly global.

### Data Layer
All Supabase queries go through the service layer — never call `supabase` directly from components:

```
Component → Custom Hook (src/hooks/) → Service (src/services/) → supabaseClient (src/lib/supabaseClient.ts)
```

### React Compiler
The Babel React Compiler plugin is active. **Do not add manual `useMemo` or `useCallback`** unless you have a measured performance reason — the compiler handles this automatically.

### Authentication
- Google OAuth via Supabase Auth
- User profiles synced to the `perfiles` Supabase table on first login
- OAuth hash params are cleaned from the URL after processing; a `sessionStorage` flag prevents duplicate processing on re-renders

---

## Key File Paths

| File | Role |
|---|---|
| [src/main.tsx](src/main.tsx) | Entry point — providers, router setup, OAuth init |
| [src/App.tsx](src/App.tsx) | Route definitions |
| [src/context/AuthContext.tsx](src/context/AuthContext.tsx) | Auth provider (257 lines) |
| [src/context/auth-context.ts](src/context/auth-context.ts) | Auth types and interfaces |
| [src/context/CartContext.tsx](src/context/CartContext.tsx) | Cart provider |
| [src/hooks/useCatalog.ts](src/hooks/useCatalog.ts) | Catalog data fetching hook |
| [src/services/catalogService.ts](src/services/catalogService.ts) | All catalog Supabase queries |
| [src/types/catalog.ts](src/types/catalog.ts) | Product, category, subcategory types |
| [src/lib/supabaseClient.ts](src/lib/supabaseClient.ts) | Supabase client instance |
| [src/pages/Master/NavBar.tsx](src/pages/Master/NavBar.tsx) | Global navigation, cart dropdown, auth modals |

Pages live in `src/pages/<Name>/<Name>Page.tsx`.

---

## Coding Conventions

### Naming
- **Pages & Components:** PascalCase, one file per folder — `pages/Inicio/InicioPage.tsx`
- **Services, hooks, utils:** camelCase — `catalogService.ts`, `useCatalog.ts`
- **Type files:** camelCase — `catalog.ts`, `auth-context.ts`

### TypeScript
- Strict mode is on — no `any`, no unused variables or parameters
- Define all prop types with explicit interfaces
- Use union types for role/status fields

### Styling
- Tailwind utility classes only — no custom CSS unless absolutely necessary
- Mobile-first responsive: base → `sm:` → `md:` → `lg:`
- Primary color: `rose-700` / `rose-500`; background: `rose-50`; text: `slate-*`
- Rounded corners: `rounded-xl` / `rounded-2xl`; shadows: `shadow-sm` / `shadow-xl`

### Async / Data Fetching
- Always use `try/catch` in async functions
- Show loading and error states in UI
- Use a `mounted` ref flag to prevent state updates after unmount

---

## Common Tasks

### Adding a new page

1. Create `src/pages/<Name>/<Name>Page.tsx` as a functional component
2. Add a `<Route path="/<path>" element={<NamePage />} />` in [src/App.tsx](src/App.tsx)
3. If it needs a nav link, add it to [src/pages/Master/NavBar.tsx](src/pages/Master/NavBar.tsx)

### Adding a new data entity

1. Define TypeScript types in `src/types/`
2. Add the Supabase query to [src/services/catalogService.ts](src/services/catalogService.ts)
3. Create or extend a custom hook in `src/hooks/` that calls the service
4. Use the hook in the component — never call the service directly from JSX

### Modifying the cart

All cart logic is in [src/context/CartContext.tsx](src/context/CartContext.tsx). Items are keyed by `productId::dedication`. Max quantity per item is 50. Any changes must stay in sync with the `dulcenube_cart_v1` localStorage format.

### Debugging

- **Supabase issues:** check the Supabase Dashboard (Auth logs, Table Editor, Edge Logs)
- **Missing data:** verify `.env` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- **Routing issues:** remember all URLs use `#` hash prefix — test with `/#/route`
- **Auth loops:** check `sessionStorage` flags used to prevent duplicate OAuth processing
- **Build/deploy:** run `npm run build` then `npm run deploy` (gh-pages)

### Styling changes

Apply Tailwind classes directly in JSX. Keep the rose/slate palette. Check mobile layout first (`< sm`), then scale up.

---

## Environment Variables

```
VITE_SUPABASE_URL=<supabase project url>
VITE_SUPABASE_ANON_KEY=<supabase anon/public key>
```

Never commit `.env` to version control.

---

## Scripts

```bash
npm run dev      # Start dev server on port 5177
npm run build    # Production build → dist/
npm run preview  # Preview the production build locally
npm run deploy   # Deploy dist/ to GitHub Pages
npm run lint     # Run ESLint
```
