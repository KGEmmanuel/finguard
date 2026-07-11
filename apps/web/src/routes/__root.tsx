import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { useCurrentUser } from "@/lib/queries";
import { roleMeta } from "@/lib/mock-data";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md p-8 text-center">
        <div className="mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Route not indexed
        </div>
        <h1 className="mono mt-2 text-6xl font-semibold text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This surface is not part of the FinGuard mesh.
        </p>
        <Link
          to="/"
          className="mono mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
        >
          Return to Overview
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="panel max-w-md p-8 text-center">
        <h1 className="text-xl font-semibold tracking-tight">Surface failed to load</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A telemetry error was reported. Retry or return to Overview.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => { router.invalidate(); reset(); }}
            className="mono inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-xs font-medium uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
          <a
            href="/"
            className="mono inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-xs font-medium uppercase tracking-wider text-foreground hover:bg-accent"
          >
            Overview
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Cognita FinGuard v2.0 — Financial AI Governance & Enforcement" },
      { name: "description", content: "Tiered governance mesh for financial AI: multi-source discovery, probabilistic guardrails, and continuously updated audit defensibility." },
      { name: "author", content: "Cognita" },
      { property: "og:title", content: "Cognita FinGuard v2.0 — Financial AI Governance & Enforcement" },
      { property: "og:description", content: "Tiered governance mesh for financial AI: multi-source discovery, probabilistic guardrails, and continuously updated audit defensibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Cognita FinGuard v2.0 — Financial AI Governance & Enforcement" },
      { name: "twitter:description", content: "Tiered governance mesh for financial AI: multi-source discovery, probabilistic guardrails, and continuously updated audit defensibility." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c5f13947-7281-4ae7-b80f-8f3a6afc7f75/id-preview-f3381b57--c5a1d293-44e3-417c-b7fc-8fa50a6da3e8.lovable.app-1783389549542.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/c5f13947-7281-4ae7-b80f-8f3a6afc7f75/id-preview-f3381b57--c5a1d293-44e3-417c-b7fc-8fa50a6da3e8.lovable.app-1783389549542.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function TopBar() {
  const path = useRouterState({ select: (r) => r.location.pathname });
  const { data: user } = useCurrentUser();
  const role = roleMeta(user?.role);
  const clean = path === "/" ? "OVERVIEW" : path.replace(/^\//, "").replace(/-/g, " ").toUpperCase();
  return (
    <header className="sticky top-0 z-20 flex h-12 items-center justify-between border-b border-border bg-background/85 px-3 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger aria-label="Toggle navigation" />
        <div className="mono flex min-w-0 items-center gap-2 text-[11px] tracking-widest text-muted-foreground">
          <span className="text-foreground/60">FINGUARD MESH</span>
          <span className="text-muted-foreground/50">/</span>
          <span className="truncate text-foreground">{clean}</span>
        </div>
      </div>

      {/* Center: live tier telemetry strip */}
      <div className="mono hidden items-center gap-3 text-[10px] md:flex">
        {([
          { t: 1, label: "T1", val: "41ms", color: "var(--tier-1)" },
          { t: 2, label: "T2", val: "318ms", color: "var(--tier-2)" },
          { t: 3, label: "T3", val: "async", color: "var(--tier-3)" },
        ] as const).map((x) => (
          <div key={x.t} className="flex items-center gap-1.5">
            <span className="ticker-dot" style={{ color: x.color }} />
            <span className="text-muted-foreground">{x.label}</span>
            <span className="text-foreground/90 tabular-nums">{x.val}</span>
          </div>
        ))}
      </div>

      <div className="mono flex shrink-0 items-center gap-3 text-[11px] text-muted-foreground">
        {user && (
          <div className="hidden items-center gap-1.5 lg:flex">
            <span style={{ color: role.color }}>●</span>
            <span className="text-foreground">{user.profile?.display_name ?? user.email}</span>
            <span className="text-muted-foreground">· {role.label}</span>
          </div>
        )}
      </div>
    </header>
  );
}

function AppShell() {
  return (
    <SidebarProvider>
      <div className="flex min-h-dvh w-full">
        <AppSidebar />
        <div className="flex min-h-dvh flex-1 flex-col">
          <TopBar />
          <main className="flex-1"><Outlet /></main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const path = useRouterState({ select: (r) => r.location.pathname });
  // The /auth page renders its own centered layout — no sidebar chrome.
  const isAuthRoute = path.startsWith("/auth");

  return (
    <QueryClientProvider client={queryClient}>
      {isAuthRoute ? <Outlet /> : <AppShell />}
    </QueryClientProvider>
  );
}
