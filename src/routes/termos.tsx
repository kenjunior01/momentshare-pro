import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/termos")({
  head: () => ({
    meta: [
      { title: "Termos de Serviço - Memoir" },
      { name: "description", content: "Termos de serviço da plataforma Memoir." },
    ],
  }),
  component: TermosPage,
});

function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="glass border-b border-border/30 sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-6 flex items-center gap-4 h-16">
          <a
            href="/"
            className="grid size-9 place-items-center rounded-full hover:bg-secondary/60 transition-colors"
          >
            <ArrowLeft className="size-4 text-foreground/70" />
          </a>
          <h1 className="text-sm font-semibold text-foreground">Termos de Serviço</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">1. Utilização do serviço</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O Memoir é uma plataforma de galerias de fotografias para eventos. Ao criar uma conta, concorda com estes termos. A utilização por convidados via QR code não exige aceitação explícita, mas implica a aceitação destes termos.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">2. Conteúdo dos utilizadores</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O organizador é responsável pelo conteúdo que publica e pelas fotografias que carrega. Os convidados são responsáveis pelas fotografias e mensagens que partilham. O Memoir reserva-se o direito de remover conteúdo que viole a lei ou estes termos, incluindo mas não limitado a conteúdo ofensivo, ilegal ou que viole a privacidade de terceiros.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">3. Planos e pagamentos</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Os preços são apresentados em Metical (MZN) e podem ser alterados com aviso prévio de 30 dias. Os planos gratuitos incluem funcionalidades limitadas. Os planos pagos são cobrados por evento ou mensalmente, conforme selecionado. O reembolso não está disponível após o evento ter sido criado.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">4. Disponibilidade</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O Memoir esforça-se por manter o serviço disponível, mas não garante disponibilidade ininterrupta. O serviço pode estar indisponível por manutenção, atualizações ou fatores fora do nosso controlo. As fotografias são armazenadas de forma segura e com cópias de segurança regulares.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">5. Contacto</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Para questões sobre estes termos, contacte-nos em termos@memoir.mz.
          </p>
        </section>
        <p className="text-xs text-muted-foreground/60 pt-4 border-t border-border/40">
          Última atualização: Agosto 2025
        </p>
      </main>
    </div>
  );
}
