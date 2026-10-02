import { cn } from '@/utils/cn';

export interface GiftBoxProps {
  /** `opening` swaps the idle bob for the lid-fly-off animation. */
  state?: 'idle' | 'opening';
  className?: string;
}

/**
 * The animated CSS gift box shown on the landing and unlock stages.
 * Pure markup — every visual comes from `styles/experience.css`, so it
 * automatically inherits the active theme's accent colours.
 */
export function GiftBox({ state = 'idle', className }: GiftBoxProps) {
  return (
    <div className={cn(state === 'opening' ? 'unlock__gift' : 'gift', className)} aria-hidden="true">
      <span className="gift__glow" />
      <span className="gift__box" />
      <span className="gift__ribbon" />
      <span className="gift__lid" />
      <span className="gift__bow" />
    </div>
  );
}
