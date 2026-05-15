import React from "react";
import { View, Text, ActivityIndicator } from "react-native";
import Logo from "../../assets/logo.svg";

export function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFED", padding: 24 }}>
      <Logo width={140} height={140} style={{ marginBottom: 24 }} />
      <Text
        style={{
          fontSize: 22,
          fontFamily: "Lobster_400Regular",
          color: "#FC9853",
          textAlign: "center",
          marginBottom: 8,
        }}
      >
        Mattox Home Manager
      </Text>
      <Text style={{ fontSize: 14, color: "#6b7280", textAlign: "center", marginBottom: 24 }}>
        Loading the Mattox Home Manager Application
      </Text>
      <ActivityIndicator size="small" color="#FC9853" />
    </View>
  );
}
