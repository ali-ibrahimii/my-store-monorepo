// ============================================================
// تب‌های اصلی اپ موبایل
// ============================================================

import { Tabs } from "expo-router";
import { Text } from "react-native";
import { colors } from "../../components/ui";

function TabIcon({ emoji }: { emoji: string }) {
  return <Text style={{ fontSize: 18 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        tabBarStyle: { borderTopColor: colors.border },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "امروز",
          tabBarLabel: "امروز",
          tabBarIcon: () => <TabIcon emoji="🏠" />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: "فاکتورها",
          tabBarLabel: "فاکتورها",
          tabBarIcon: () => <TabIcon emoji="🧾" />,
        }}
      />
      <Tabs.Screen
        name="scanner"
        options={{
          title: "اسکن",
          tabBarLabel: "اسکن",
          tabBarIcon: () => <TabIcon emoji="📷" />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "پروفایل",
          tabBarLabel: "پروفایل",
          tabBarIcon: () => <TabIcon emoji="👤" />,
        }}
      />
    </Tabs>
  );
}
