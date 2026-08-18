import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportError } from "../lib/error-reporting";

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
  const router = useRouter();
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
            onClick={() => {
              router.invalidate();
              reset();
            }}
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
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
    </QueryClientProvider>
  );
}
