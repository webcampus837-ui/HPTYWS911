import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';

export interface ConfettiBurstOptions {
  /** Number of particles emitted. */
  count?: number;
  /** Seconds during which particles keep spawning (0 = single pop). */
  duration?: number;
  /** Emission point in viewport fractions (0..1). */
  origin?: { x: number; y: number };
  /** Total spread in degrees. */
  spread?: number;
  /** Multiplier on launch velocity. */
  speed?: number;
  /** Launch angle in degrees, 90 = straight up. */
  angle?: number;
}

export interface ConfettiHandle {
  burst: (options?: ConfettiBurstOptions) => void;
  /** Classic two-cannon celebration from the bottom corners. */
  celebrate: (options?: { count?: number; duration?: number }) => void;
  stop: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  shape: 0 | 1 | 2;
  rotation: number;
  vr: number;
  wobble: number;
  vw: number;
  life: number;
  decay: number;
}

const GRAVITY = 0.085;
const DRAG = 0.992;
const MAX_PARTICLES = 900;
const DEFAULT_COLORS = ['#f472b6', '#a78bfa', '#fbbf24', '#34d399', '#ffffff'];

/**
 * Dependency-free confetti.
 *
 * A single fixed canvas sits above the page and only runs a rAF loop while
 * particles are alive, so an idle birthday page costs nothing. The whole
 * effect is skipped when the visitor prefers reduced motion (handled by the
 * caller passing `disabled`).
 */
export const ConfettiCanvas = forwardRef<ConfettiHandle, { colors?: string[]; disabled?: boolean }>(
  function ConfettiCanvas({ colors, disabled = false }, ref) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const particlesRef = useRef<Particle[]>([]);
    const frameRef = useRef<number | null>(null);
    const emittersRef = useRef<{ until: number; every: number; next: number; fire: () => void }[]>([]);
    const colorsRef = useRef<string[]>(colors && colors.length >= 2 ? colors : DEFAULT_COLORS);
    const disabledRef = useRef(disabled);

    colorsRef.current = colors && colors.length >= 2 ? colors : DEFAULT_COLORS;
    disabledRef.current = disabled;

    const resize = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(window.innerWidth * dpr));
      canvas.height = Math.max(1, Math.round(window.innerHeight * dpr));
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }, []);

    const stopLoop = useCallback(() => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    }, []);

    const tick = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        stopLoop();
        return;
      }
      const now = performance.now();

      // Keep timed emitters running (used by `celebrate`).
      const stillRunning: typeof emittersRef.current = [];
      for (const emitter of emittersRef.current) {
        if (now < emitter.until) {
          if (now >= emitter.next) {
            emitter.fire();
            emitter.next = now + emitter.every;
          }
          stillRunning.push(emitter);
        }
      }
      emittersRef.current = stillRunning;

      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      const particles = particlesRef.current;
      const alive: Particle[] = [];

      for (const p of particles) {
        p.vy += GRAVITY;
        p.vx *= DRAG;
        p.vy *= DRAG;
        p.x += p.vx + Math.cos(p.wobble) * 0.6;
        p.y += p.vy;
        p.rotation += p.vr;
        p.wobble += p.vw;
        p.life -= p.decay;

        if (p.life <= 0 || p.y > window.innerHeight + 80) continue;
        alive.push(p);

        const scale = Math.max(0.2, Math.min(1, p.life * 2.2));
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life * 1.6));
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === 0) {
          // flat rectangle that "flutters" by squashing on the x axis
          const flutter = Math.cos(p.wobble) * 0.85;
          ctx.scale(Math.max(0.15, Math.abs(flutter)), 1);
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else if (p.shape === 1) {
          ctx.beginPath();
          ctx.arc(0, 0, (p.size / 2) * scale, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // ribbon / streamer
          ctx.fillRect(-p.size * 0.18, -p.size * 0.9, p.size * 0.36, p.size * 1.8);
        }
        ctx.restore();
      }

      particlesRef.current = alive;

      if (alive.length > 0 || emittersRef.current.length > 0) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        stopLoop();
      }
    }, [stopLoop]);

    const startLoop = useCallback(() => {
      if (frameRef.current === null) frameRef.current = requestAnimationFrame(tick);
    }, [tick]);

    const emit = useCallback(
      (
        count: number,
        originX: number,
        originY: number,
        angleDeg: number,
        spreadDeg: number,
        speed: number,
      ) => {
        if (disabledRef.current) return;
        const palette = colorsRef.current;
        const list = particlesRef.current;
        const room = Math.max(0, MAX_PARTICLES - list.length);
        const total = Math.min(count, room);
        for (let i = 0; i < total; i += 1) {
          const angle = ((angleDeg + (Math.random() - 0.5) * spreadDeg) * Math.PI) / 180;
          const velocity = speed * (0.55 + Math.random() * 0.7);
          const shape = (i % 3) as 0 | 1 | 2;
          list.push({
            x: originX + (Math.random() - 0.5) * 24,
            y: originY + (Math.random() - 0.5) * 12,
            vx: Math.cos(angle) * velocity,
            vy: -Math.sin(angle) * velocity,
            size: 6 + Math.random() * 8,
            color: palette[Math.floor(Math.random() * palette.length)] ?? DEFAULT_COLORS[0],
            shape,
            rotation: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.28,
            wobble: Math.random() * Math.PI * 2,
            vw: 0.06 + Math.random() * 0.11,
            life: 1,
            decay: 0.0035 + Math.random() * 0.004,
          });
        }
        startLoop();
      },
      [startLoop],
    );

    const burst = useCallback(
      (options: ConfettiBurstOptions = {}) => {
        if (disabledRef.current) return;
        const {
          count = 110,
          duration = 0,
          origin = { x: 0.5, y: 0.45 },
          spread = 120,
          speed = 11,
          angle = 90,
        } = options;
        const ox = origin.x * window.innerWidth;
        const oy = origin.y * window.innerHeight;

        if (duration <= 0) {
          emit(count, ox, oy, angle, spread, speed);
          return;
        }
        const perTick = Math.max(4, Math.round(count / 8));
        emittersRef.current.push({
          until: performance.now() + duration * 1000,
          every: 90,
          next: 0,
          fire: () => emit(perTick, ox, oy, angle, spread, speed),
        });
        emit(perTick * 2, ox, oy, angle, spread, speed);
      },
      [emit],
    );

    const celebrate = useCallback(
      (options: { count?: number; duration?: number } = {}) => {
        if (disabledRef.current) return;
        const { count = 90, duration = 1.6 } = options;
        const until = performance.now() + duration * 1000;
        const perTick = Math.max(3, Math.round(count / 10));
        const fire = (side: 'left' | 'right') => () =>
          emit(
            perTick,
            side === 'left' ? window.innerWidth * 0.08 : window.innerWidth * 0.92,
            window.innerHeight * 0.98,
            side === 'left' ? 62 : 118,
            44,
            15,
          );
        emittersRef.current.push(
          { until, every: 130, next: 0, fire: fire('left') },
          { until, every: 130, next: 65, fire: fire('right') },
        );
        fire('left')();
        fire('right')();
        burst({ count: Math.round(count * 0.7), origin: { x: 0.5, y: 0.35 }, spread: 150, speed: 12 });
      },
      [burst, emit],
    );

    const stop = useCallback(() => {
      particlesRef.current = [];
      emittersRef.current = [];
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      stopLoop();
    }, [stopLoop]);

    useImperativeHandle(ref, () => ({ burst, celebrate, stop }), [burst, celebrate, stop]);

    useEffect(() => {
      resize();
      window.addEventListener('resize', resize);
      window.addEventListener('orientationchange', resize);
      return () => {
        window.removeEventListener('resize', resize);
        window.removeEventListener('orientationchange', resize);
        stopLoop();
      };
    }, [resize, stopLoop]);

    useEffect(() => {
      if (disabled) stop();
    }, [disabled, stop]);

    return <canvas ref={canvasRef} className="confetti-canvas" aria-hidden="true" />;
  },
);
