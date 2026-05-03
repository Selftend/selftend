import { router } from 'expo-router';
import { LogOutIcon, MonitorIcon, MoonIcon, SettingsIcon, SunIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { signOut } from '@/src/features/auth/api';
import { useSession } from '@/src/providers/session-provider';
import { useThemeStore } from '@/src/stores/theme-store';
import type { TriggerRef } from '@rn-primitives/popover';

function getInitials(email: string | undefined): string {
  if (!email) return '?';
  return email[0].toUpperCase();
}

export function UserMenu() {
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  const { user } = useSession();
  const { preference, setPreference } = useThemeStore();

  const email = user?.email;
  const initials = getInitials(email);

  async function onSignOut() {
    popoverTriggerRef.current?.close();
    await signOut();
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <UserAvatar initials={initials} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-72 p-0">
        <View className="border-border gap-3 border-b p-3">
          <View className="flex-row items-center gap-3">
            <UserAvatar initials={initials} className="size-10" />
            <View className="flex-1">
              <Text
                className="text-sm text-muted-foreground font-normal leading-4"
                numberOfLines={1}
              >
                {email ?? 'Account'}
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-3 py-0.5">
            <Button
              variant="outline"
              size="sm"
              onPress={() => {
                popoverTriggerRef.current?.close();
                router.push('/(app)/(tabs)/settings');
              }}>
              <Icon as={SettingsIcon} className="size-4" />
              <Text>Settings</Text>
            </Button>
            <Button variant="outline" size="sm" className="flex-1" onPress={onSignOut}>
              <Icon as={LogOutIcon} className="size-4" />
              <Text>Sign Out</Text>
            </Button>
          </View>
        </View>
        <View className="flex-row border-border border-t">
          <Button
            variant={preference === 'light' ? 'secondary' : 'ghost'}
            className="flex-1 rounded-none rounded-bl-md gap-1.5"
            onPress={() => setPreference('light')}>
            <Icon as={SunIcon} className="size-4 text-foreground" />
            <Text>Light</Text>
          </Button>
          <Button
            variant={preference === 'dark' ? 'secondary' : 'ghost'}
            className="flex-1 rounded-none gap-1.5"
            onPress={() => setPreference('dark')}>
            <Icon as={MoonIcon} className="size-4 text-foreground" />
            <Text>Dark</Text>
          </Button>
          <Button
            variant={preference === 'system' ? 'secondary' : 'ghost'}
            className="flex-1 rounded-none rounded-br-md gap-1.5"
            onPress={() => setPreference('system')}>
            <Icon as={MonitorIcon} className="size-4 text-foreground" />
            <Text>System</Text>
          </Button>
        </View>
      </PopoverContent>
    </Popover>
  );
}

function UserAvatar({
  className,
  initials,
  ...props
}: Omit<React.ComponentProps<typeof Avatar>, 'alt'> & { initials: string }) {
  return (
    <Avatar alt="User avatar" className={cn('size-8', className)} {...props}>
      <AvatarFallback>
        <Text>{initials}</Text>
      </AvatarFallback>
    </Avatar>
  );
}
