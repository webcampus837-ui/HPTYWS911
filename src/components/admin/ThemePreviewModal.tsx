import { useEffect, useMemo, useState } from 'react';
import type { ExperiencePhoto } from '@/types';
import type { ThemeConfig } from '@/types/theme';
import { Modal } from '@/components/ui/Modal';
import { ThemedStage } from '@/components/theme/ThemedStage';
import {
  GateScreen,
  MessageScreen,
  PhotosScreen,
  RevealScreen,
  StepDots,
} from '@/components/experience/screens';
import type { Stage } from '@/components/experience/screens';
import { SAMPLE_EXPERIENCE, samplePhotos } from '@/themes/sample';
import { themeSalt } from '@/themes/random';
import { firstName as toFirstName } from '@/utils/message';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/utils/cn';

/** The four moments of the public experience an admin can inspect. */
export type PreviewTab = 'landing' | 'reveal' | 'message' | 'photos';

const TABS: { id: PreviewTab; label: string }[] = [
  { id: 'landing', label: 'Landing' },
  { id: 'reveal', label: 'Reveal' },
  { id: 'message', label: 'Message' },
  { id: 'photos', label: 'Photos' },
];

/** Maps a tab onto the real progress dots used on the public page. */
const TAB_STAGE: Record<PreviewTab, Stage> = {
  landing: 'gate',
  reveal: 'reveal',
  message: 'message',
  photos: 'photos',
};

export interface ThemePreviewModalProps {
  open: boolean;
  theme: ThemeConfig | null;
  /** Real name/message/photos from the form; falls back to the sample data. */
  name?: string;
  message?: string;
  photos?: ExperiencePhoto[];
  /** Show the "Use this theme" action (picker context). */
  onSelect?: (theme: ThemeConfig) => void;
  selected?: boolean;
  onClose: () => void;
}

/**
 * A true preview of a theme.
 *
 * It renders the *actual* public screens (`GateScreen`, `RevealScreen`,
 * `MessageScreen`, `PhotosScreen`) inside a contained `ThemedStage`, so what
 * the admin sees here is what the birthday person will see — same background,
 * decorations, card, buttons, fonts and photo gallery.
 *
 * Per the preview rules, the date-of-birth check is bypassed: submitting any
 * valid date simply walks the preview forward. Nothing about the real gate is
 * weakened, because this component never talks to the database.
 */
export function ThemePreviewModal({
  open,
  theme,
  name,
  message,
  photos,
  onSelect,
  selected = false,
  onClose,
}: ThemePreviewModalProps) {
  const [tab, setTab] = useState<PreviewTab>('landing');
  const reducedMotion = useReducedMotion();

  // Every new preview starts at the beginning of the story.
  useEffect(() => {
    if (open) setTab('landing');
  }, [open, theme?.id]);

  const personName = useMemo(() => name?.trim() || SAMPLE_EXPERIENCE.name, [name]);
  const shortName = toFirstName(personName);

  const previewMessage = useMemo(() => {
    const custom = message?.trim();
    const text = custom || SAMPLE_EXPERIENCE.message;
    return text.replaceAll('{name}', shortName);
  }, [message, shortName]);

  const previewPhotos = useMemo<ExperiencePhoto[]>(
    () => (photos && photos.length > 0 ? photos : samplePhotos(6)),
    [photos],
  );

  if (!open || !theme) return null;

  const advance = () => {
    const index = TABS.findIndex((entry) => entry.id === tab);
    setTab(TABS[(index + 1) % TABS.length].id);
  };

  let screen;
  if (tab === 'landing') {
    screen = (
      <GateScreen
        theme={theme}
        firstName={shortName}
        busy={false}
        error={null}
        errorKey={0}
        onVerify={() => setTab('reveal')}
      />
    );
  } else if (tab === 'reveal') {
    screen = <RevealScreen theme={theme} name={personName} onNext={advance} />;
  } else if (tab === 'message') {
    screen = (
      <MessageScreen
        theme={theme}
        name={personName}
        message={previewMessage}
        nextLabel="See your photos 📸"
        onNext={advance}
      />
    );
  } else {
    screen = (
      <PhotosScreen
        theme={theme}
        photos={previewPhotos}
        reducedMotion={reducedMotion}
        onNext={advance}
      />
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={
        <span className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className="h-4 w-4 shrink-0 rounded-full border border-white/20"
            style={{
              background: `linear-gradient(135deg, ${theme.colors.bg1}, ${theme.colors.accent})`,
            }}
          />
          {theme.name}
        </span>
      }
      subtitle={theme.description}
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Close
          </button>
          {onSelect ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                onSelect(theme);
                onClose();
              }}
              disabled={selected}
            >
              {selected ? '✓ Currently selected' : 'Use this theme'}
            </button>
          ) : null}
        </>
      }
    >
      <div className="flex flex-col gap-3">
        {/* Tabs -------------------------------------------------------- */}
        <div
          role="tablist"
          aria-label="Preview screens"
          className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1.5"
        >
          {TABS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              id={`theme-preview-tab-${entry.id}`}
              aria-selected={tab === entry.id}
              aria-controls="theme-preview-panel"
              onClick={() => setTab(entry.id)}
              className={cn(
                'flex-1 rounded-lg px-3 py-1.5 text-[0.8rem] font-semibold transition-colors',
                'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2',
                tab === entry.id
                  ? 'bg-brand-500 text-white shadow'
                  : 'text-slate-300 hover:bg-white/[0.06] hover:text-white',
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>

        {/* Live stage -------------------------------------------------- */}
        <div
          id="theme-preview-panel"
          role="tabpanel"
          aria-labelledby={`theme-preview-tab-${tab}`}
          className="theme-preview h-[26rem] overflow-hidden rounded-2xl border border-white/10 bg-black/40 sm:h-[32rem]"
        >
          <ThemedStage
            key={`${theme.id}-${tab}`}
            theme={theme}
            mode="contained"
            salt={themeSalt(theme.id)}
            decorScale={0.7}
            className="h-full w-full"
          >
            {screen}
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-1 pb-2">
              <StepDots stage={TAB_STAGE[tab]} />
            </div>
          </ThemedStage>
        </div>

        <p className="text-[0.78rem] leading-relaxed text-slate-400">
          Preview only — the date of birth is not checked here, and nothing is
          saved until you submit the form.{' '}
          {photos && photos.length > 0
            ? 'Your own photos are shown in the gallery.'
            : 'Sample artwork stands in for the photo gallery.'}
        </p>
      </div>
    </Modal>
  );
}
