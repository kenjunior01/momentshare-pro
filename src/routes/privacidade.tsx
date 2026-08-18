import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacidade")({
  head: () => ({
    meta: [
      { title: "Política de Privacidade - Memoir" },
      { name: "description", content: "Política de privacidade da plataforma Memoir." },
    ],
  }),
  component: PrivacidadePage,
});

function PrivacidadePage() {
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
          <h1 className="text-sm font-semibold text-foreground">Política de Privacidade</h1>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">1. Dados que recolhemos</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O Memoir recolhe apenas os dados necessários para o funcionamento da plataforma: endereço de email e nome do organizador (para autenticação), e dados do evento (nome, data, localização). Os convidados que acedem via QR code não fornecem nenhum dado pessoal, a menos que decidam carregar fotos ou escrever no livro de honra — nesse caso, apenas o nome escolhido e a mensagem ficam registados.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">2. Fotografias e conteúdo</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            As fotografias carregadas pelos convidados ficam armazenadas de forma segura e só são acedidas por pessoas com o link ou QR code do evento. O organizador pode moderar o livro de honra antes da publicação. Nenhuma fotografia é utilizada para treino de modelos de IA ou partilhada com terceiros sem consentimento explícito.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">3. Reconhecimento facial</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            O reconhecimento facial é opcional e funciona apenas quando o convidado decide tirar uma selfie para encontrar as suas fotos. Os embeddings faciais são armazenados de forma encriptada e associados apenas ao evento específico. O utilizador pode solicitar a eliminação dos seus dados faciais a qualquer momento.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">4. Cookies e armazenamento local</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Utilizamos localStorage para guardar a preferência de idioma (PT/EN) e a sessão de autenticação do organizador. Não utilizamos cookies de rastreamento ou publicidade de terceiros.
          </p>
        </section>
        <section>
          <h2 className="font-display text-2xl text-foreground mb-4">5. Contacto</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Para questões relacionadas com privacidade ou para solicitar a eliminação dos seus dados, contacte-nos através de privacy@memoir.mz.
          </p>
        </section>
        <p className="text-xs text-muted-foreground/60 pt-4 border-t border-border/40">
          Última atualização: Agosto 2025
        </p>
      </main>
    </div>
  );
}
