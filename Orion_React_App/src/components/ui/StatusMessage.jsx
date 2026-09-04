import "./ui.css";

export function StatusMessage({ tone = "info", children, className = "" }) {
  const role = tone === "error" ? "alert" : "status";
  return <div className={`ui-status ui-status--${tone} ${className}`.trim()} role={role}>{children}</div>;
}
