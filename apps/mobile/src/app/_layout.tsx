// ============================================================
// ریشه‌ی اپ موبایل (Expo Router)
//
//   (auth)  → صفحه‌های ورود و ثبت‌نام (بدون نشست)
//   (tabs)  → تب‌های اصلی (فقط بعد از ورود)
//
// نگهبان مسیر (RouteGuard) با وضعیت ورود کار می‌کند: اگر وارد نباشید
// هر مسیری شما را به /login می‌برد و برعکس.
// ============================================================

import "../lib/rtl";

import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Loading, colors } from "../components/ui";
import { AuthProvider, useAuth } from "../lib/auth";

const AUTH_ROUTES = ["/login", "/register"];

function RouteGuard() {
  const { status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const inAuthGroup = AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  useEffect(() => {
    if (status === "loading") return;
    if (status === "authenticated" && inAuthGroup) {
      router.replace("/");
      return;
    }
    if (status === "unauthenticated" && !inAuthGroup) {
      router.replace("/login");
    }
  }, [status, inAuthGroup, router]);

  return null;
}

function AppNavigator() {
  const { status } = useAuth();

  // تا وقتی نمی‌دانیم توکن ذخیره‌شده معتبر است یا نه، صفحه‌ی ورود را
  // نشان نمی‌دهیم (وگرنه یک چشمک می‌زند).
  if (status === "loading") {
    return (
      <View style={styles.splash}>
        <Loading label="در حال بررسی نشست…" />
      </View>
    );
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false, animation: "fade" }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
      <RouteGuard />
    </>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, backgroundColor: colors.bg, justifyContent: "center" },
});
