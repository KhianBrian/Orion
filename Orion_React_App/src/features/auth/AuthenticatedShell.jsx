import { Outlet } from "react-router-dom";
import Footer from "../../components/Footer";
import Navbar from "../../components/Navbar";
import "./authenticatedShell.css";

export function AuthenticatedShell() {
  return <section className="app-shell" data-testid="authenticated-shell"><Navbar /><a className="skip-link" href="#app-content">Skip to content</a><main id="app-content" className="app-content" tabIndex="-1"><Outlet /></main><Footer /></section>;
}
