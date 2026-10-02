export type ClassValue = string | number | null | false | undefined;

/** Tiny className combiner (keeps JSX readable without extra dependencies). */
export function cn(...classes: ClassValue[]): string {
  return classes.filter(Boolean).join(' ');
}
