import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export const isDevelopment = () =>
  process.env.NODE_ENV === 'development' ||
  location.hostname === 'localhost' ||
  location.hostname === '127.0.0.1';
