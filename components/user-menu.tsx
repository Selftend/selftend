import { router } from 'expo-router';
import { LogOutIcon, SettingsIcon } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';

import { ProfileAvatar } from '@/components/profile-avatar';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Text } from '@/components/ui/text';
import { signOut } from '@/src/features/auth/api';
import { useUserProfile } from '@/src/features/profile/queries';
import { useSession } from '@/src/providers/session-provider';
import type { TriggerRef } from '@rn-primitives/popover';

export function UserMenu() {
  const popoverTriggerRef = React.useRef<TriggerRef>(null);
  const { user } = useSession();
  const { data: profile } = useUserProfile(user);

  const email = user?.email;
  const avatarUrl = profile?.avatarUrl ?? null;

  async function onSignOut() {
    popoverTriggerRef.current?.close();
    await signOut();
  }

  return (
    <Popover>
      <PopoverTrigger asChild ref={popoverTriggerRef}>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <ProfileAvatar avatarUrl={avatarUrl} email={email} />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" className="w-72 p-0">
        <View className="gap-3 p-3">
          <View className="flex-row items-center gap-3">
            <ProfileAvatar avatarUrl={avatarUrl} email={email} className="size-10" />
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
      </PopoverContent>
    </Popover>
  );
}
