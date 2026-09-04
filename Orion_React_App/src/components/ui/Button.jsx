import { Link } from "react-router-dom";
import "./ui.css";

export function Button({ variant = "primary", busy = false, className = "", children, ...props }) {
  return <button className={`ui-button ui-button--${variant} ${className}`.trim()} disabled={busy || props.disabled} {...props}>{busy ? "Please wait…" : children}</button>;
}

export function ButtonLink({ to, variant = "primary", className = "", children, ...props }) {
  return <Link to={to} className={`ui-button ui-button--${variant} ${className}`.trim()} {...props}>{children}</Link>;
}
