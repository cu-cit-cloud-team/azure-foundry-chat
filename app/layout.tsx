import type React from 'react';

const { WEBSITE_TITLE_PREFIX } = process.env;

import './globals.css';

import { Providers } from '@/app/providers';

const titlePrefix = WEBSITE_TITLE_PREFIX?.trim()?.length
  ? `${WEBSITE_TITLE_PREFIX.trim()} - `
  : '';

export const metadata = {
  title: `${titlePrefix}Cloud Team Chat`,
  description: 'Powered by Azure OpenAI Service',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <div className="page-wrapper">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
