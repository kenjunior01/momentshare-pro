import { useEffect, useCallback, useRef, useState } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  shape: "rect" | "circle";
}

const COLORS = ["#C08552", "#F5F0E8", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#38bdf8"];

function createParticle(centerX: number, centerY: number): Particle {
  const angle = Math.random() * Math.PI * 2;
  const velocity = 4 + Math.random() * 8;
  return {
    x: centerX,
    y: centerY,
    vx: Math.cos(angle) * velocity,
    vy: Math.sin(angle) * velocity - 6,
    color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? "#C08552",
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    rotationSpeed: (Math.random() - 0.5) * 12,
    opacity: 1,
    shape: Math.random() > 0.5 ? "rect" : "circle",
  };
}

export function ConfettiEffect({ active, x, y }: { active: boolean; x: number; y: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animationRef = useRef<number>(0);
  const [visible, setVisible] = useState(false);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    particlesRef.current = particlesRef.current
      .map((p) => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
        vy: p.vy + 0.18,
        vx: p.vx * 0.99,
        rotation: p.rotation + p.rotationSpeed,
        opacity: p.opacity - 0.012,
        size: p.size * 0.998,
      }))
      .filter((p) => p.opacity > 0 && p.y < canvas.height + 50);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const p of particlesRef.current) {
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate((p.rotation * Math.PI) / 180);
      ctx.fillStyle = p.color;
      if (p.shape === "rect") {
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6);
      } else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    if (particlesRef.current.length > 0) {
      animationRef.current = requestAnimationFrame(animate);
    } else {
      setVisible(false);
    }
  }, []);

  useEffect(() => {
    if (active) {
      setVisible(true);
      const count = 80;
      particlesRef.current = Array.from({ length: count }, () =>
        createParticle(x ?? window.innerWidth / 2, y ?? window.innerHeight / 2),
      );
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [active, x, y, animate]);

  if (!visible) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[9999]"
      aria-hidden="true"
    />
  );
}
