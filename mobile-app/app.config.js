/**
 * Expo App Configuration
 * Reads environment variables and makes them available via expo-constants
 * 
 * Required environment variables (see env.txt):
 *   API_BASE_URL - API server URL
 *   FRONTEND_URL - Web frontend URL
 */

if (!process.env.API_BASE_URL) {
  console.warn('WARNING: API_BASE_URL environment variable is not set');
}
if (!process.env.FRONTEND_URL) {
  console.warn('WARNING: FRONTEND_URL environment variable is not set');
}

export default {
  expo: {
    name: "Brakebee",
    slug: "brakebee",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.brakebee.app"
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      edgeToEdgeEnabled: true,
      package: "com.brakebee.app"
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    extra: {
      apiBaseUrl: process.env.API_BASE_URL,
      frontendUrl: process.env.FRONTEND_URL,
      environment: process.env.APP_ENV,
      eas: {
        projectId: process.env.EAS_PROJECT_ID
      }
    }
  }
};
