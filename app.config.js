import 'dotenv/config';

export default {
  expo: {
    name: "Language Learning Voice Assistant",
    slug: "language-learning-voice-assistant",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: true,
      microphone: "Allow app to record audio for language learning",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      permissions: [
        "RECORD_AUDIO",
        "WRITE_EXTERNAL_STORAGE",
        "READ_EXTERNAL_STORAGE"
      ]
    },
    web: {
      bundler: "metro",
      output: "single",
      favicon: "./assets/images/favicon.png"
    },
    plugins: [
      "expo-router",
      "expo-font",
      "expo-web-browser",
      [
        "expo-av",
        {
          microphonePermission: "Allow app to record audio for language learning conversations."
        }
      ],
      "expo-audio"
    ],
    experiments: {
      typedRoutes: true
    },
    extra: {
      apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL || "http://192.168.43.20:8000",
      apiToken: process.env.EXPO_PUBLIC_API_TOKEN || "",
      conversationPath: "/"
    }
  }
};