import React, { Component, ReactNode } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { queryClient } from "@/lib/queryClient";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  handleReset = () => {
    queryClient.clear();
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
            backgroundColor: "#FFFFED",
          }}
        >
          <Text style={{ fontSize: 48, marginBottom: 16 }}>😔</Text>
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: "#1f2937",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: "#6b7280",
              marginBottom: 28,
              textAlign: "center",
              lineHeight: 20,
            }}
          >
            {this.state.error?.message ?? "An unexpected error occurred."}
          </Text>
          <TouchableOpacity
            onPress={this.handleReset}
            style={{
              backgroundColor: "#FC9853",
              borderRadius: 12,
              paddingHorizontal: 28,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "white", fontWeight: "600", fontSize: 15 }}>
              Try Again
            </Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}
