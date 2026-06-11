import dayjs from 'dayjs';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';
import { ArrowUpCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@/app/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/app/components/ui/tooltip';

import pkg from '../../package.json';

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('America/New_York');

export const UpdateCheck = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const timerRef = useRef<number | null>(null);
  const intervalRef = useRef<number>(5 * 60 * 1000); // Start at 5 minutes
  const MAX_INTERVAL = 60 * 60 * 1000; // 1 hour

  useEffect(() => {
    let stopped = false;

    const compareVersions = (v1: string, v2: string): number => {
      const clean1 = v1.replace(/^v/, '');
      const clean2 = v2.replace(/^v/, '');
      const parts1 = clean1
        .split(/[-.]/)
        .map((p) => (Number.isNaN(Number(p)) ? p : Number(p)));
      const parts2 = clean2
        .split(/[-.]/)
        .map((p) => (Number.isNaN(Number(p)) ? p : Number(p)));
      const maxLength = Math.max(parts1.length, parts2.length);
      for (let i = 0; i < maxLength; i++) {
        const part1 = parts1[i] ?? 0;
        const part2 = parts2[i] ?? 0;
        if (typeof part1 === 'number' && typeof part2 === 'number') {
          if (part1 !== part2) {
            return part1 - part2;
          }
        } else {
          const str1 = String(part1);
          const str2 = String(part2);
          if (str1 !== str2) {
            return str1.localeCompare(str2);
          }
        }
      }
      return 0;
    };

    const getLatestVersion = async (
      org = 'cu-cit-cloud-team',
      repo = 'azure-foundry-chat'
    ) => {
      try {
        const response = await fetch(
          `https://api.github.com/repos/${org}/${repo}/tags?per_page=100`
        );
        if (!response.ok) {
          console.error('Failed to fetch tags');
          setUpdateAvailable(false);
          return false;
        }
        const tags = await response.json();
        if (!Array.isArray(tags) || tags.length === 0) {
          setUpdateAvailable(false);
          return false;
        }
        const versionTags = tags.filter((t: { name: string }) =>
          /^v\d+\.\d+\.\d+/.test(t.name)
        );
        if (versionTags.length === 0) {
          setUpdateAvailable(false);
          return false;
        }
        const sortedTags = versionTags.sort(
          (a: { name: string }, b: { name: string }) =>
            compareVersions(b.name, a.name)
        );
        const latestTag = sortedTags[0];
        const latestVersion = latestTag.name;
        const currentVersion = `v${pkg.version}`;
        const comparison = compareVersions(latestVersion, currentVersion);
        const isNewer = comparison > 0;
        setUpdateAvailable(isNewer);
        return isNewer;
      } catch (error) {
        console.error('Error checking for updates:', error);
        setUpdateAvailable(false);
        return false;
      }
    };

    const poll = async () => {
      if (stopped) {
        return;
      }
      const foundUpdate = await getLatestVersion();
      if (foundUpdate) {
        stopped = true;
        return;
      }
      // Exponential backoff: double interval, cap at MAX_INTERVAL
      intervalRef.current = Math.min(intervalRef.current * 2, MAX_INTERVAL);
      timerRef.current = window.setTimeout(poll, intervalRef.current);
    };

    // Start polling at 5 minutes
    timerRef.current = window.setTimeout(poll, intervalRef.current);
    // Also check immediately on mount
    getLatestVersion();

    return () => {
      stopped = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [MAX_INTERVAL]);

  const handleUpdate = () => {
    // Clear all caches and reload
    if ('caches' in window) {
      caches.keys().then((names) => {
        for (const name of names) {
          caches.delete(name);
        }
      });
    }
    // Clear localStorage and sessionStorage
    localStorage.clear();
    sessionStorage.clear();
    // Hard reload
    window.location.reload();
  };

  return updateAvailable ? (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant='outline'
            size='sm'
            onClick={handleUpdate}
            className='gap-2 bg-orange-500/10 text-orange-600 hover:bg-orange-500/20 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300'
          >
            <ArrowUpCircle className='size-4' />
            Update available
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to reload and get the latest version</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ) : null;
};

export default UpdateCheck;
