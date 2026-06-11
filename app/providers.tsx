import { Provider } from 'jotai';
import { ThemeProvider } from 'next-themes';
import type React from 'react';

import { TooltipProvider } from '@/app/components/ui/tooltip';

export const Providers = ({ children }: { children: React.ReactNode }) => {
  return (
    <Provider>
      <ThemeProvider
        attribute='class'
        defaultTheme='dark'
        enableSystem
        disableTransitionOnChange
      >
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </Provider>
  );
};

Providers.displayName = 'Providers';

export default Providers;
