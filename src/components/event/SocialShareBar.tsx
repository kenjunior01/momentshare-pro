import { useState, useCallback } from "react";
import { Share2, Copy, Check, MessageCircle, Instagram } from "lucide-react";

interface SocialShareBarProps {
  url: string;
  text?: string | undefined;
  photoUrl?: string | undefined;
  eventName?: string | undefined;
}

export function SocialShareBar({ url, text, photoUrl, eventName }: SocialShareBarProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined" ? window.location.origin + url : url;
  const shareText =
    text ??
    `Veja as fotos do ${eventName ?? "evento"} em Memoir — cada momento, eternamente guardado.`;

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleWhatsApp = useCallback(() => {
    const encoded = encodeURIComponent(`${shareText}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }, [shareText, shareUrl]);

  const handleInstagram = useCallback(() => {
    const caption = `${shareText}\n\n${shareUrl}`;
    navigator.clipboard.writeText(caption);
    window.open("https://www.instagram.com/", "_blank");
  }, [shareText, shareUrl]);

  const handleNativeShare = useCallback(async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: eventName ?? "Memoir",
        text: shareText,
        url: shareUrl,
      });
    } catch {
      // User cancelled or not supported
    }
  }, [eventName, shareText, shareUrl]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleCopy}
        className="grid size-9 place-items-center rounded-full border border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:scale-110"
        title={copied ? "Copiado!" : "Copiar link"}
      >
        {copied ? (
          <Check className="size-4 text-emerald-500" />
        ) : (
          <Copy className="size-4 text-muted-foreground" />
        )}
      </button>
      <button
        onClick={handleWhatsApp}
        className="grid size-9 place-items-center rounded-full border border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-emerald-500/40 hover:scale-110"
        title="Partilhar no WhatsApp"
      >
        <MessageCircle className="size-4 text-emerald-600" />
      </button>
      <button
        onClick={handleInstagram}
        className="grid size-9 place-items-center rounded-full border border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-pink-500/40 hover:scale-110"
        title="Partilhar no Instagram"
      >
        <Instagram className="size-4 text-pink-500" />
      </button>
      {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
        <button
          onClick={handleNativeShare}
          className="grid size-9 place-items-center rounded-full border border-border/60 bg-card/80 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:scale-110"
          title="Partilhar"
        >
          <Share2 className="size-4 text-muted-foreground" />
        </button>
      )}
    </div>
  );
}

export function ShareFloatingButton({ url, eventName }: { url: string; eventName?: string | undefined }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3">
      {open && (
        <div className="animate-rise rounded-lg border border-border/60 bg-card/95 backdrop-blur-md p-3 shadow-lg">
          <p className="mb-2 text-xs font-semibold text-foreground">Partilhar evento</p>
          <SocialShareBar url={url} eventName={eventName} />
        </div>
      )}
      <button
        onClick={() => setOpen((v) => !v)}
        className={`btn-glow grid size-14 place-items-center rounded-full shadow-lg transition-all duration-300 ${
          open ? "bg-primary rotate-45" : "bg-foreground hover:bg-primary"
        }`}
      >
        <Share2
          className={`size-5 transition-colors ${open ? "text-primary-foreground" : "text-background"}`}
        />
      </button>
    </div>
  );
}
