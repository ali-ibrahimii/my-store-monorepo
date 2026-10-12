import { useState } from "react";
import type { MobileSession } from "@my-store/shared-types";
import { getSession } from "./lib/api";
import { LoginScreen } from "./components/LoginScreen";
import { ScannerScreen } from "./components/ScannerScreen";

export function App() {
  const [session, setSession] = useState<MobileSession | null>(() => getSession());

  if (!session) {
    return <LoginScreen onLoggedIn={setSession} />;
  }
  return <ScannerScreen session={session} onLoggedOut={() => setSession(null)} />;
}
