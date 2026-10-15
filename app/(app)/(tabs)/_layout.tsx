import { Tabs } from "expo-router";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, Label, type IconName } from "../../../src/components/ui";
import { color } from "../../../src/theme";
import { feedback } from "../../../src/lib/feedback";
import { usePreferences } from "../../../src/state/preferences";
const names: Record<string, { label: string; icon: IconName }> = {
  index: { label: "Focus", icon: "maximize" },
  history: { label: "History", icon: "rotate-ccw" },
  settings: { label: "Settings", icon: "settings" },
};
export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { reduced } = usePreferences();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: reduced ? "none" : "fade",
      }}
      tabBar={({ state, navigation }) => (
        <View
          style={{
            backgroundColor: color.canvas.focus,
            paddingBottom: Math.max(insets.bottom, 12),
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 480,
              alignSelf: "center",
              flexDirection: "row",
              justifyContent: "space-around",
              paddingTop: 8,
            }}
          >
            {state.routes.map((route, index) => {
              const tab = names[route.name];
              if (!tab) return null;
              const active = state.index === index;
              return (
                <Pressable
                  accessibilityRole="tab"
                  accessibilityLabel={tab.label}
                  accessibilityState={{ selected: active }}
                  key={route.key}
                  onPress={() => {
                    const event = navigation.emit({
                      type: "tabPress",
                      target: route.key,
                      canPreventDefault: true,
                    });
                    if (!active && !event.defaultPrevented) {
                      feedback();
                      navigation.navigate(route.name);
                    }
                  }}
                  style={{
                    minWidth: 76,
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 32,
                    alignItems: "center",
                    gap: 3,
                    backgroundColor: active ? color.accent.mint : "transparent",
                  }}
                >
                  <Icon name={tab.icon} size={20} />
                  <Label size={11}>{tab.label}</Label>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
