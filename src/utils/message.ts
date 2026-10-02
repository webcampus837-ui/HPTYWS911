import { PRESET_MESSAGES } from '@/data/presetMessages';

/** First word of a full name, or "friend" when the name is empty. */
export function firstName(name: string): string {
  const first = name.trim().split(/\s+/)[0];
  return first || 'friend';
}

/**
 * Resolve the message shown on the birthday page.
 * A custom message, when present, always wins over the preset.
 */
export function resolveMessage(
  presetMessageId: string | null,
  customMessage: string | null,
  name: string,
): string {
  const custom = customMessage?.trim();
  if (custom) return custom;
  const preset =
    PRESET_MESSAGES.find((p) => p.id === presetMessageId) ?? PRESET_MESSAGES[0];
  const shortName = firstName(name);
  return preset.text.replaceAll('{name}', shortName);
}
