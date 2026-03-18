import React from "react";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useNotificationStore } from "@/stores/notificationStore";

function TabIcon({ emoji, label, focused }: { emoji: string; label: string; focused: boolean }) {
  return (
    <View className="items-center pt-1">
      <Text style={{ fontSize: 20 }}>{emoji}</Text>
      <Text
        className={`text-xs mt-0.5 ${focused ? "text-blue-600 font-semibold" : "text-gray-400"}`}
      >
        {label}
      </Text>
    </View>
  );
}

function TasksTabIcon({ focused }: { focused: boolean }) {
  const count = useNotificationStore((s) => s.overdueTaskCount);
  return (
    <View className="items-center pt-1">
      <View>
        <Text style={{ fontSize: 20 }}>🔔</Text>
        {count > 0 && (
          <View className="absolute -top-1 -right-2 bg-red-500 rounded-full min-w-[16px] h-4 items-center justify-center px-0.5">
            <Text className="text-white text-xs font-bold">{count > 9 ? "9+" : count}</Text>
          </View>
        )}
      </View>
      <Text
        className={`text-xs mt-0.5 ${focused ? "text-blue-600 font-semibold" : "text-gray-400"}`}
      >
        Tasks
      </Text>
    </View>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          height: 80,
          paddingBottom: 8,
          paddingTop: 4,
          borderTopColor: "#e5e7eb",
        },
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="(home)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏠" label="Home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(tasks)"
        options={{
          tabBarIcon: ({ focused }) => <TasksTabIcon focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="(projects)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🏗️" label="Projects" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(travel)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="✈️" label="Travel" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(services)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔧" label="Services" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(ideas)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💡" label="Ideas" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(vendors)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🔍" label="Vendors" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="⚙️" label="Settings" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
