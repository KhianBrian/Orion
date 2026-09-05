import { useEffect, useRef } from "react";
import { Button } from "./Button";
import "./ui.css";

export function Dialog({ open, onClose, title, children, actions, className = "" }) {
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return undefined;
    if (open && !dialog.open) {
      triggerRef.current = document.activeElement;
      dialog.showModal();
    }
    if (!open && dialog.open) dialog.close();
    return undefined;
  }, [open]);

  const close = () => onClose();
  const handleClose = () => {
    if (open) onClose();
    triggerRef.current?.focus?.();
  };

  return <dialog ref={dialogRef} className={`ui-dialog ${className}`.trim()} aria-labelledby="dialog-title" onCancel={(event) => { event.preventDefault(); close(); }} onClose={handleClose}>
    <div className="ui-dialog__header"><h2 id="dialog-title">{title}</h2><Button type="button" variant="icon" aria-label={`Close ${title}`} onClick={close}>×</Button></div>
    <div className="ui-dialog__content">{children}</div>
    {actions && <div className="ui-dialog__actions">{actions}</div>}
  </dialog>;
}
