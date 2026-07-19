import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function appendUtmTags(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.searchParams.has('utm_source')) parsed.searchParams.set('utm_source', 'google');
    if (!parsed.searchParams.has('utm_medium')) parsed.searchParams.set('utm_medium', 'organic');
    if (!parsed.searchParams.has('utm_campaign')) parsed.searchParams.set('utm_campaign', 'gbp');
    return parsed.toString();
  } catch (e) {
    return url;
  }
}
