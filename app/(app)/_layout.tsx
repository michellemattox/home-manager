import React from "react";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useNotificationStore } from "@/stores/notificationStore";
import { useNotificationScheduler } from "@/hooks/useNotificationScheduler";

// Mounts the scheduler as a side-effect component inside the authenticated tab tree
function NotificationScheduler() {
  useNotificationScheduler();
  return null;
}

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
    <>
      <NotificationScheduler />
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
        name="(ideas)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="💡" label="Ideas" focused={focused} />
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
        name="(activity)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🗓️" label="Activity" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(goals)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🎯" label="Goals" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="(garden)"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon emoji="🌱" label="Garden" focused={focused} />
          ),
        }}
      />
      {/* Hidden tabs — content moved into Projects sub-tabs or Home settings */}
      <Tabs.Screen name="(travel)" options={{ href: null }} />
      <Tabs.Screen name="(services)" options={{ href: null }} />
      <Tabs.Screen name="(vendors)" options={{ href: null }} />
      <Tabs.Screen name="settings" options={{ href: null }} />
    </Tabs>
    </>
  );
}
