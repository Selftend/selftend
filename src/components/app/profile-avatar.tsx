import * as React from "react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/react-native-reusables/avatar";
import { Text } from "@/src/components/react-native-reusables/text";
import { cn } from "@/lib/utils";

function getInitial(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email;
  if (!source) {
    return "?";
  }

  return source[0].toUpperCase();
}

export function ProfileAvatar({
  avatarUrl,
  className,
  email,
  name,
  ...props
}: Omit<React.ComponentProps<typeof Avatar>, "alt"> & {
  avatarUrl?: string | null;
  email?: string | null;
  name?: string | null;
}) {
  return (
    <Avatar alt="User avatar" className={cn("size-8", className)} {...props}>
      {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
      <AvatarFallback>
        <Text>{getInitial(name, email)}</Text>
      </AvatarFallback>
    </Avatar>
  );
}
