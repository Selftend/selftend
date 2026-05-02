import { Link } from "expo-router";
import { Text } from "react-native";

import { Screen } from "@/src/components/screen";

export default function NotFoundScreen() {
  return (
    <Screen scroll={false} title="Page not found">
      <Link href="/" replace>
        <Text className="text-base font-semibold text-pine underline">Home</Text>
      </Link>
    </Screen>
  );
}
