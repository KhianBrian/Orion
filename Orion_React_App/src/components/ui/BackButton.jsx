import { Link } from "react-router-dom";
import "./back-button.css";

function BackIcon() {
  return <svg className="back-button__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M19 18v-2a4 4 0 0 0-4-4H5" />
    <path d="m9 8-4 4 4 4" />
  </svg>;
}

function BackButtonContent({ label }) {
  return <>
    <BackIcon />
    <span className="back-button__label">{label}</span>
  </>;
}

export function BackButton({ to, label, onClick, className = "", ...props }) {
  const classes = `back-button ${className}`.trim();
  const sharedProps = {
    ...props,
    "aria-label": label,
    className: classes,
    title: label,
  };

  if (to) {
    return <Link to={to} {...sharedProps}><BackButtonContent label={label} /></Link>;
  }

  return <button type="button" onClick={onClick} {...sharedProps}><BackButtonContent label={label} /></button>;
}
