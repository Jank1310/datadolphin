import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getHost(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";
}
