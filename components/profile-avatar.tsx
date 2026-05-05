import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

export function getInitials(email: string | null | undefined): string {
  if (!email) {
    return "?";
  }

  return email[0].toUpperCase();
}

export function ProfileAvatar({
  avatarUrl,
  className,
  email,
  ...props
}: Omit<React.ComponentProps<typeof Avatar>, "alt"> & {
  avatarUrl?: string | null;
  email?: string | null;
}) {
  return (
    <Avatar alt="User avatar" className={cn("size-8", className)} {...props}>
      {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
      <AvatarFallback>
        <Text>{getInitials(email)}</Text>
      </AvatarFallback>
    </Avatar>
  );
}
