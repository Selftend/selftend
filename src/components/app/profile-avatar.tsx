import * as React from "react";
import { useTranslation } from "react-i18next";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/src/components/react-native-reusables/avatar";
import { AvatarPersonGlyph } from "@/src/components/app/avatar-person-glyph";
import { Text } from "@/src/components/react-native-reusables/text";
import { getInitial } from "@/src/features/profile/avatar-initial";
import { cn } from "@/lib/utils";

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
  const { t } = useTranslation("navigation");
  const initial = getInitial(name, email);

  return (
    <Avatar alt={t("userMenu.avatarAlt")} className={cn("size-8", className)} {...props}>
      {avatarUrl ? <AvatarImage source={{ uri: avatarUrl }} /> : null}
      <AvatarFallback>
        {/*
          A person glyph when there is no letter to take (#1810). The `?` this
          replaces was `getInitial`'s refusal-to-invent sentinel leaking into the
          UI: it reads as an error, where the truth is only *no photo yet*.
          `Icon` is `aria-hidden` already, and the fallback is decorative here -
          the name sits beside it in every surface that mounts this.
        */}
        {initial === null ? <AvatarPersonGlyph className="size-5" /> : <Text>{initial}</Text>}
      </AvatarFallback>
    </Avatar>
  );
}
