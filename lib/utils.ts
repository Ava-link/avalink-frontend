import { clsx, type ClassValue } from "clsx"
// If tailwind-merge is missing, provide a fallback implementation
let twMerge: (...classes: string[]) => string;

try {
  // @ts-ignore
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  twMerge = require("tailwind-merge").twMerge;
} catch {
  // Fallback: just join the class names (no merging)
  twMerge = (...classes: string[]) => classes.filter(Boolean).join(" ");
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
