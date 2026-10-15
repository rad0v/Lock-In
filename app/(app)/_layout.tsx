import { Stack } from "expo-router";
import { DataProvider } from "../../src/state/data";
import { useSession } from "../../src/state/session";
import { usePreferences } from "../../src/state/preferences";
import { ReminderProvider } from "../../src/state/reminders";
export default function AppLayout() {
  const { identity } = useSession();
  const { reduced } = usePreferences();
  return (
    <DataProvider key={identity!.key}>
      <ReminderProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: reduced ? "none" : "slide_from_right",
            animationDuration: 220,
          }}
        >
          <Stack.Screen name="(tabs)" />
        </Stack>
      </ReminderProvider>
    </DataProvider>
  );
}
