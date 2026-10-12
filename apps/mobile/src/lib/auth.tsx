// ============================================================
// نگه‌داری وضعیت ورود (Auth) در اپ موبایل
//
// تفاوتش با وب: اینجا کوکی نداریم. توکن را در AsyncStorage
// (روی گوشی: Keychain/SharedPreferences، روی وب: localStorage)
// نگه می‌داریم و در هر درخواست `Authorization: Bearer <token>` می‌فرستیم.
//
// جریان:
//   ۱) موقع باز شدن اپ، توکن ذخیره‌شده خوانده می‌شود
//   ۲) با GET /api/auth/mobile/session اعتبارش بررسی می‌شود
//   ۳) معتبر → تب‌ها؛ نامعتبر/نبود → صفحه‌ی ورود
// ============================================================

import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { LoginInput, RegisterInput, SessionUser } from "@my-store/shared-types";
import { MOBILE_TOKEN_COOKIE } from "@my-store/shared-utils";
import {
  describeApiError,
  fetchSession,
  initApiClient,
  isUnauthorized,
  setAuthToken,
  login as apiLogin,
  register as apiRegister,
} from "./api";

// یک‌بار موقع لود ماژول — با remount شدن درخت هم تنظیمات نمی‌پرد
initApiClient();

const STORAGE_KEY = "my-store.auth.v1";

/**
 * در پلتفرم وب، توکن را به‌صورت کوکی هم ذخیره می‌کنیم.
 * چرا؟ پروکسی پیش‌نمایش (e2b/arena) هدر `Authorization` را از درخواست‌ها
 * حذف می‌کند، ولی کوکی‌ها را (مثل وب‌اپ) عبور می‌دهد. روی native کوکی
 * معنا ندارد و همان هدر Authorization استفاده می‌شود.
 */
function syncWebCookie(token: string | null): void {
  if (typeof document === "undefined") return;
  try {
    if (token) {
      document.cookie = `${MOBILE_TOKEN_COOKIE}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 30}; samesite=lax`;
    } else {
      document.cookie = `${MOBILE_TOKEN_COOKIE}=; path=/; max-age=0`;
    }
  } catch {
    // کوکی اختیاری است؛ AsyncStorage منبع اصلی است
  }
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface AuthContextValue {
  status: AuthStatus;
  token: string | null;
  user: SessionUser | null;
  signIn: (input: LoginInput) => Promise<void>;
  signUp: (input: RegisterInput) => Promise<void>;
  signOut: () => Promise<void>;
  /** وقتی یک درخواست ۴۰۱ داد، اپ را به صفحه‌ی ورود برمی‌گردانیم */
  handleAuthError: (error: unknown) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface StoredAuth {
  token: string;
  user: SessionUser;
}

function parseStored(raw: string | null): StoredAuth | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<StoredAuth>;
    if (!value?.token || !value?.user?.id || !value?.user?.storeId) return null;
    return { token: value.token, user: value.user as SessionUser };
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  const persist = useCallback(async (value: StoredAuth | null) => {
    try {
      if (value) await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      else await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      // اگر ذخیره‌سازی در دسترس نبود، حداقل در حافظه کار می‌کند
    }
  }, []);

  const applySession = useCallback(
    async (value: StoredAuth) => {
      setAuthToken(value.token); // از همین لحظه همه‌ی درخواست‌ها هدر می‌گیرند
      syncWebCookie(value.token); // و در وب، کوکی هم می‌گذاریم (عبور از پروکسی)
      setToken(value.token);
      setUser(value.user);
      setStatus("authenticated");
      await persist(value);
    },
    [persist],
  );

  const clearSession = useCallback(async () => {
    setAuthToken(null);
    syncWebCookie(null);
    setToken(null);
    setUser(null);
    setStatus("unauthenticated");
    await persist(null);
  }, [persist]);

  // ---- bootstrap: خواندن توکن ذخیره‌شده و اعتبارسنجی آن ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      let stored: StoredAuth | null = null;
      try {
        stored = parseStored(await AsyncStorage.getItem(STORAGE_KEY));
      } catch {
        stored = null;
      }
      if (cancelled) return;

      if (!stored) {
        setStatus("unauthenticated");
        return;
      }

      // تا وقتی اعتبار توکن را نمی‌دانیم، کاربر را «وارد شده» نگه می‌داریم
      // تا چشمک نزند؛ اگر ۴۰۱ شد همان لحظه به ورود می‌رود.
      setAuthToken(stored.token);
      syncWebCookie(stored.token);
      setToken(stored.token);
      setUser(stored.user);
      setStatus("authenticated");

      try {
        const { user: fresh } = await fetchSession();
        if (cancelled) return;
        setUser(fresh);
        await persist({ token: stored.token, user: fresh });
      } catch (error) {
        if (cancelled) return;
        if (isUnauthorized(error)) {
          await clearSession();
        }
        // خطای شبکه: کاربر واردشده می‌ماند تا آفلاین هم UI را ببیند
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [clearSession, persist]);

  const signIn = useCallback(
    async ({ email, password }: LoginInput) => {
      const session = await apiLogin({
        email: email.trim(),
        password,
      });
      await applySession({ token: session.token, user: session.user });
    },
    [applySession],
  );

  const signUp = useCallback(
    async (input: RegisterInput) => {
      await apiRegister(input);
      // بعد از ثبت‌نام، مستقیم وارد می‌شویم
      const session = await apiLogin({ email: input.email, password: input.password });
      await applySession({ token: session.token, user: session.user });
    },
    [applySession],
  );

  const signOut = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  /** اگر خطا ۴۰۱ بود نشست را پاک می‌کند و `true` برمی‌گرداند. */
  const handleAuthError = useCallback(
    (error: unknown): boolean => {
      if (!isUnauthorized(error)) return false;
      void clearSession();
      return true;
    },
    [clearSession],
  );

  const value = useMemo<AuthContextValue>(
    () => ({ status, token, user, signIn, signUp, signOut, handleAuthError }),
    [status, token, user, signIn, signUp, signOut, handleAuthError],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth باید داخل AuthProvider استفاده شود");
  return context;
}

/** پیام خطای آماده‌ی نمایش برای صفحه‌های ورود/ثبت‌نام */
export { describeApiError };
