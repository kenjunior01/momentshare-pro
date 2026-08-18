import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouterState,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center animate-rise">
        <p className="text-8xl font-display font-bold text-foreground/10">404</p>
        <h1 className="-mt-6 text-xl font-display font-semibold text-foreground">
          Página não encontrada
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          A página que procura não existe ou foi movida.
        </p>
        <div className="mt-8">
          <Link
            to="/"
            className="btn-glow inline-flex items-center justify-center rounded-sm bg-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-primary"
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  useEffect(() => {
    reportError(error, { boundary: "root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-7xl font-display font-bold text-foreground/10">!</p>
        <h1 className="-mt-4 text-xl font-display font-semibold tracking-tight text-foreground">
          Algo correu mal
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Ocorreu um erro inesperado. Pode tentar recarregar a página ou voltar ao início.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            onClick={reset}
            className="btn-glow inline-flex items-center justify-center rounded-sm bg-foreground px-6 py-3 text-xs font-bold uppercase tracking-widest text-background transition-colors hover:bg-primary"
          >
            Tentar novamente
          </button>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-sm border border-input bg-background px-6 py-3 text-xs font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Voltar ao início
          </Link>
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
      { title: "Memoir" },
      {
        name: "description",
        content:
          "A recordação digital para cada convidado. Galerias de fotos para eventos por QR code e reconhecimento facial.",
      },
      { name: "theme-color", content: "#F5F0E8" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400..700;1,400..700&family=Nunito+Sans:ital,opsz,wght@0,6..12,200..1000;1,6..12,200..1000&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),

  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('memoir-theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body>
        <Toaster position="top-center" richColors closeButton />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

/* ═══════════ ROUTE LOADING PROGRESS BAR ═══════════ */

function RouteProgressBar() {
  const { isLoading } = useRouterState({ select: (s) => ({ isLoading: s.isLoading }) });
  const [width, setWidth] = useState(0);
  const [opacity, setOpacity] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLoadingRef = useRef(false);

  const startBar = useCallback(() => {
    // Reset
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpacity(1);
    setWidth(0);
    // Quickly animate to 80%
    requestAnimationFrame(() => {
      setWidth(80);
    });
  }, []);

  const finishBar = useCallback(() => {
    setWidth(100);
    // After reaching 100%, fade out
    timeoutRef.current = setTimeout(() => {
      setOpacity(0);
      // Reset width after fade
      timeoutRef.current = setTimeout(() => {
        setWidth(0);
      }, 300);
    }, 200);
  }, []);

  useEffect(() => {
    // Detect transition from not-loading to loading
    if (isLoading && !prevLoadingRef.current) {
      startBar();
    } else if (!isLoading && prevLoadingRef.current) {
      finishBar();
    }
    prevLoadingRef.current = isLoading;

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [isLoading, startBar, finishBar]);

  if (opacity === 0 && width === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-0.5 pointer-events-none"
      style={{ opacity }}
    >
      <div
        className="h-full"
        style={{
          width: `${width}%`,
          backgroundColor: "var(--color-primary)",
          transition:
            width === 0 ? "none" : "width 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s ease",
        }}
      />
    </div>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <RouteProgressBar />
      <Outlet />
    </QueryClientProvider>
  );
}
