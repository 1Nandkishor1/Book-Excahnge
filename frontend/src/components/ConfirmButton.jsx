import { useEffect, useRef, useState } from "react";

// First click arms the button ("Accept" -> "Confirm accept"); a second click within 3 seconds runs the action.
export default function ConfirmButton({ children, confirmLabel = "Confirm", onConfirm, className = "", armedClassName, disabled }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearTimeout(timer.current), []);

  const disarm = () => {
    clearTimeout(timer.current);
    setArmed(false);
  };

  const click = () => {
    if (armed) {
      disarm();
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = setTimeout(() => setArmed(false), 3000);
  };

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={click}
      onBlur={disarm}
      className={armed ? armedClassName || className : className}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
