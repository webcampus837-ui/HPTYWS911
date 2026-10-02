export interface PresetMessage {
  id: string;
  name: string;
  /** {name} is replaced with the birthday person's first name. */
  text: string;
}

/**
 * Preset birthday messages.
 * Edit the text here and every birthday page that uses the preset updates.
 */
export const PRESET_MESSAGES: PresetMessage[] = [
  {
    id: 'simple',
    name: 'Simple Birthday',
    text: 'Happy Birthday, {name}! 🎉 May this year bring you everything you have been quietly wishing for.',
  },
  {
    id: 'sweet',
    name: 'Sweet Birthday',
    text: 'Happy birthday, {name}! You make the world softer, brighter and sweeter just by being in it. 🍰',
  },
  {
    id: 'best-friend',
    name: 'Best Friend',
    text: '{name}, another year of legendary memories together. Happy birthday, partner in crime! 🥳',
  },
  {
    id: 'funny',
    name: 'Funny Birthday',
    text: "Happy birthday, {name}! You're not old — you're just classic. Like fine art. Or cheese. Delicious either way. 😄",
  },
  {
    id: 'emotional',
    name: 'Emotional Birthday',
    text: 'Happy birthday, {name}. Some people leave footprints on our hearts — you left an entire map. Thank you for being exactly who you are. ❤️',
  },
  {
    id: 'short-cute',
    name: 'Short & Cute',
    text: 'Happy birthday, {name}! 🎂 Stay cute, stay you, stay amazing.',
  },
  {
    id: 'elegant',
    name: 'Elegant',
    text: 'To {name}, on a day as remarkable as you are. Wishing you a year of grace, success and quiet joys. Happy Birthday.',
  },
  {
    id: 'family',
    name: 'Family',
    text: 'Happy birthday, {name}! No matter the distance or the years, you are family — and family is everything. 🏡',
  },
  {
    id: 'celebration',
    name: 'Celebration',
    text: "It's party time! 🎊 Happy birthday, {name}! Music up, confetti out — today the world celebrates YOU.",
  },
  {
    id: 'surprise',
    name: 'Surprise',
    text: 'Surprise, {name}! 🎁 You thought today would be a normal day… but today is YOUR day. Happy birthday!',
  },
  {
    id: 'poetic',
    name: 'Poetic',
    text: 'Happy birthday, {name} — may your year bloom like spring and shine like every star you have ever wished on. ✨',
  },
  {
    id: 'warm-wish',
    name: 'Warm Wish',
    text: 'Wishing you the happiest of birthdays, {name}. May today be the start of your best year yet. 🌟',
  },
];

export function getPresetById(id: string | null | undefined): PresetMessage | undefined {
  if (!id) return undefined;
  return PRESET_MESSAGES.find((p) => p.id === id);
}
