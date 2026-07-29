import { Stack } from "expo-router";
import { View } from "react-native";

import { AndroidDownloadBar } from "@/src/components/app/android-download-bar";

export default function AuthLayout() {
  return (
    <View className="flex-1">
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
          }}
        />
      </View>
      {/* Public/auth routes only (#388 section 4): an Android browser gets a
          one-line, forever-dismissible offer to grab the Play build. */}
      <AndroidDownloadBar />
    </View>
  );
}
