import { Outlet } from "react-router-dom";

export function AuthenticatedShell() {
  return <section data-testid="authenticated-shell"><Outlet /></section>;
}
