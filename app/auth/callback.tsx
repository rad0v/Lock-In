import { router } from "expo-router";
import { Button, Label, Screen } from "../../src/components/ui";
export default function Callback() {
  return (
    <Screen contentStyle={{ justifyContent: "center", gap: 24 }}>
      <Label>
        This sign-in link has expired. Start again from the sign-in screen.
      </Label>
      <Button
        title="BACK TO SIGN IN"
        onPress={() => router.replace("/sign-in")}
      />
    </Screen>
  );
}
