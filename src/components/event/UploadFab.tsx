import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, X, CheckCircle2, ImagePlus, CloudUpload } from "lucide-react";

interface UploadFabProps {
  guestName: string;
  accentColor?: string | undefined;
  onUpload?: ((files: File[]) => Promise<void>) | undefined;
}

export function UploadFab({ guestName, accentColor, onUpload }: UploadFabProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const color = accentColor ?? "var(--color-primary)";

  function handleSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setSelectedFiles(files);
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    setIsOpen(true);
  }

  const startUpload = useCallback(async () => {
    if (!onUpload) return simulateUpload();
    setStatus("uploading");
    setProgress(15);
    try {
      await onUpload(selectedFiles);
      setProgress(100);
      setStatus("done");
      setTimeout(() => resetState(), 2000);
    } catch {
      setStatus("idle");
      setProgress(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onUpload, selectedFiles]);

  const simulateUpload = useCallback(() => {
    setStatus("uploading");
    setProgress(0);

    const duration = 1500;
    const steps = 60;
    const increment = 100 / steps;
    let current = 0;

    progressRef.current = setInterval(() => {
      current += increment;
      if (current >= 100) {
        current = 100;
        setProgress(100);
        if (progressRef.current) clearInterval(progressRef.current);
        setTimeout(() => {
          setStatus("done");
          setTimeout(() => {
            resetState();
          }, 2000);
        }, 200);
        return;
      }
      setProgress(current);
    }, duration / steps);
  }, []);

  function resetState() {
    if (progressRef.current) clearInterval(progressRef.current);
    setIsOpen(false);
    setStatus("idle");
    setSelectedFiles([]);
    setProgress(0);
    previewUrls.forEach(URL.revokeObjectURL);
    setPreviewUrls([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current);
    };
  }, []);

  const initials = guestName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Upload panel */}
      {isOpen && (
        <div className="fixed inset-0 z-50 animate-fade-in">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-md"
            onClick={resetState}
          />

          {/* Panel — bottom sheet on mobile, centered modal on desktop */}
          <div className="absolute inset-x-0 bottom-0 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-md">
            <div
              className={
                "glass rounded-t-3xl sm:rounded-2xl shadow-polaroid p-5 sm:p-6 animate-slide-up"
              }
            >
              {/* Drag handle */}
              <div className="mx-auto mb-5 h-1.5 w-12 rounded-full bg-muted-foreground/20" />

              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-display text-xl text-card-foreground">Adicionar fotos</h3>
                <button
                  onClick={resetState}
                  className="glass grid size-9 place-items-center rounded-full transition-all hover:scale-110 active:scale-95"
                  aria-label="Fechar"
                >
                  <X className="size-4 text-muted-foreground" />
                </button>
              </div>

              {status === "idle" && (
                <>
                  {/* File previews */}
                  {previewUrls.length > 0 && (
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-3 mb-5">
                      {previewUrls.map((url, i) => (
                        <div
                          key={i}
                          className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden shadow-soft ring-2 ring-offset-2 ring-offset-card"
                          style={{ "--tw-ring-color": color } as React.CSSProperties}
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                        </div>
                      ))}
                      <button
                        onClick={() => inputRef.current?.click()}
                        className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-border grid place-items-center hover:bg-secondary/60 transition-all hover:scale-105 active:scale-95"
                      >
                        <ImagePlus className="size-5 text-muted-foreground" />
                      </button>
                    </div>
                  )}

                  {/* Upload as */}
                  <div className="flex items-center gap-2.5 mb-5 px-1">
                    <div
                      className="grid size-7 place-items-center rounded-full text-[10px] font-bold text-white shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      A partilhar como{" "}
                      <span className="font-semibold text-card-foreground">{guestName}</span>
                    </p>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => inputRef.current?.click()}
                      className={
                        "flex-1 inline-flex items-center justify-center gap-2 glass rounded-full px-4 py-3 text-xs font-bold uppercase tracking-wider text-card-foreground transition-all hover:scale-[1.02] active:scale-[0.98]"
                      }
                    >
                      <Camera className="size-4" /> Tirar foto
                    </button>
                    <button
                      onClick={() => void startUpload()}
                      disabled={selectedFiles.length === 0}
                      className={
                        "flex-1 inline-flex items-center justify-center gap-2 btn-glow rounded-full px-4 py-3 text-xs font-bold uppercase tracking-wider text-white transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
                      }
                      style={{ backgroundColor: color }}
                    >
                      <CloudUpload className="size-4" /> Enviar ({selectedFiles.length})
                    </button>
                  </div>
                </>
              )}

              {status === "uploading" && (
                <div className="flex flex-col items-center py-6">
                  {/* Thumbnail previews with skeleton shimmer */}
                  {previewUrls.length > 0 && (
                    <div className="flex gap-2 mb-5">
                      {previewUrls.map((url, i) => (
                        <div key={i} className="relative w-14 h-14 rounded-lg overflow-hidden">
                          <img src={url} alt="" className="w-full h-full object-cover opacity-40" />
                          <div className="absolute inset-0 skeleton" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Progress bar */}
                  <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden mb-4">
                    <div
                      className="h-full rounded-full transition-[width] duration-100 ease-linear"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: color,
                      }}
                    />
                  </div>

                  <p className="text-sm font-medium text-card-foreground">
                    A enviar {selectedFiles.length} foto
                    {selectedFiles.length > 1 ? "s" : ""}...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1.5">
                    Isto acontece instantaneamente com boa ligação
                  </p>
                </div>
              )}

              {status === "done" && (
                <div className="flex flex-col items-center py-8 animate-rise">
                  <div className="animate-[bounce-in_0.5s_cubic-bezier(0.34,1.56,0.64,1)_both] mb-4">
                    <CheckCircle2 className="size-14" style={{ color: "oklch(0.65 0.2 145)" }} />
                  </div>
                  <p className="font-display text-base font-semibold text-card-foreground">
                    Fotos adicionadas!
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Obrigado, {guestName}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        capture="environment"
        onChange={handleSelect}
        className="hidden"
      />

      {/* FAB button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40">
          {/* Pulse ring beacon */}
          <span
            className="absolute inset-0 rounded-full animate-[pulse-ring_2.5s_ease-out_infinite]"
            style={{ backgroundColor: color, opacity: 0.3 }}
          />

          <button
            onClick={() => inputRef.current?.click()}
            className="relative grid size-16 place-items-center rounded-full glass shadow-glow transition-all duration-300 ease-out hover:scale-110 active:scale-95"
            style={{
              backgroundColor: `color-mix(in oklab, ${color} 20%, oklch(0.98 0.01 80 / 70%))`,
              borderColor: `color-mix(in oklab, ${color} 25%, transparent)`,
            }}
            aria-label="Adicionar fotos"
          >
            <Camera className="size-6" style={{ color }} />
          </button>
        </div>
      )}
    </>
  );
}
