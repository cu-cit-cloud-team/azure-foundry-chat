import { useAtom } from 'jotai';
import { LogOut, UserCircle } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { Avatar, AvatarFallback } from '@/app/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import { userMetaAtom } from '@/app/utils/atoms';

export const UserAvatar = memo(() => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [hasData, setHasData] = useState(false);

  const [userMeta, setUserMeta] = useAtom(userMetaAtom);

  useEffect(() => {
    if (userMeta?.email && userMeta?.name) {
      return;
    }
    const getUserMeta = async () => {
      await fetch('/.auth/me', {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
          Expires: '0',
        },
      })
        .then(async (resp) => {
          const response = await resp.json();
          const email = response[0]?.user_claims.find(
            (item: { typ: string; val: string }) =>
              item.typ === 'preferred_username'
          ).val;

          const name = response[0]?.user_claims.find(
            (item: { typ: string; val: string }) => item.typ === 'name'
          ).val;

          const user_id = response[0]?.user_id;

          const expires_on = response[0]?.expires_on;

          const meta = {
            email,
            name,
            user_id,
            expires_on,
          };

          setUserMeta(meta);
        })
        .catch(() => {
          // Silently ignore auth fetch errors (local dev / unauthenticated)
        });
    };
    getUserMeta();
    // oxlint-disable-next-line react-hooks/exhaustive-deps - intentional, so it only runs once
  }, [setUserMeta]);

  useEffect(() => {
    if (!userMeta) {
      return;
    }

    if (userMeta?.email) {
      setEmail(userMeta.email);
    } else {
      if (userMeta?.user_id) {
        setEmail(userMeta.user_id);
      }
    }

    if (userMeta?.name) {
      setName(userMeta.name);
    }

    if (userMeta?.email && userMeta?.name) {
      setHasData(true);
    }
  }, [userMeta]);

  const formatName = useCallback((name: string) => {
    if (!name) {
      return '';
    }

    const parts = name.split(' ').map((part) => part[0].toUpperCase());
    if (parts.length > 2) {
      return `${parts[0]}${parts[parts.length - 1]}`;
    }
    return parts.join('');
  }, []);

  const initials = useMemo(() => {
    return hasData ? formatName(name) : '';
  }, [formatName, hasData, name]);

  if (!hasData) {
    return (
      <Avatar className='size-9'>
        <AvatarFallback className='bg-primary text-primary-foreground'>
          <UserCircle className='size-5' />
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <div className='flex items-center gap-2'>
      <span className='hidden text-sm lg:block'>{email}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type='button'
            className='focus:outline-none focus:ring-2 focus:ring-ring rounded-full'
          >
            <Avatar className='size-9 cursor-pointer'>
              <AvatarFallback className='bg-primary text-primary-foreground font-semibold'>
                {initials}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align='end' className='w-56'>
          <DropdownMenuLabel>
            <div className='flex flex-col space-y-1'>
              <p className='text-sm font-medium leading-none'>{name}</p>
              <p className='text-xs leading-none text-muted-foreground'>{email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href='/.auth/logout' className='cursor-pointer'>
              <LogOut className='size-4 mr-2' />
              Logout
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

UserAvatar.displayName = 'UserAvatar';

export default UserAvatar;
