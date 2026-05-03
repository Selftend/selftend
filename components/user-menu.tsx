import { router } from 'expo-router';
import { LogOutIcon, MoonIcon, SettingsIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
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
import type { TriggerRef } from '@rn-primitives/popover';

function getInitials(email: string | undefined): string {
  if (!email) return '?';
  return email[0].toUpperCase();
}

export function UserMenu() {
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  const { user } = useSession();
  const { colorScheme, setColorScheme } = useColorScheme();

  const email = user?.email;
  const initials = getInitials(email);

  async function onSignOut() {
    popoverTriggerRef.current?.close();
    await signOut();
    router.replace('/(auth)/sign-in');
  }

  function onToggleTheme() {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
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
        <Button
          variant="ghost"
          size="lg"
          className="h-14 justify-start gap-3 rounded-none rounded-b-md px-3"
          onPress={onToggleTheme}>
          <View className="size-10 items-center justify-center">
            <Icon
              as={colorScheme === 'dark' ? SunIcon : MoonIcon}
              className="size-5 text-foreground"
            />
          </View>
          <Text>{colorScheme === 'dark' ? 'Light mode' : 'Dark mode'}</Text>
        </Button>
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
