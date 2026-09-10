"use client";

import {
  ReactNode,
  ReactElement,
  MouseEvent,
  useState,
  useEffect,
  useCallback,
  cloneElement,
  isValidElement,
} from "react";
import { createPortal } from "react-dom";

interface SheetContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

import { createContext, useContext } from "react";

const SheetContext = createContext<SheetContextValue>({ open: false, setOpen: () => {} });

export function Sheet({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <SheetContext.Provider value={{ open, setOpen }}>
      {children}
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  children,
  asChild,
  className = "",
}: {
  children: ReactNode;
  asChild?: boolean;
  className?: string;
}) {
  const { setOpen } = useContext(SheetContext);
  // asChild: render the child itself as the trigger (no extra element), so a
  // <Button> child stays a single <button> instead of a button inside a button.
  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{
      onClick?: (e: MouseEvent<HTMLElement>) => void;
      className?: string;
    }>;
    return cloneElement(child, {
      className: [child.props.className, className].filter(Boolean).join(" "),
      onClick: (e: MouseEvent<HTMLElement>) => {
        child.props.onClick?.(e);
        setOpen(true);
      },
    });
  }
  return (
    <button className={className} onClick={() => setOpen(true)}>
      {children}
    </button>
  );
}

export function SheetContent({
  children,
  side = "bottom",
  className = "",
}: {
  children: ReactNode;
  side?: "bottom" | "left" | "right" | "top";
  className?: string;
}) {
  const { open, setOpen } = useContext(SheetContext);

  const handleKey = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); },
    [setOpen]
  );

  useEffect(() => {
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, handleKey]);

  if (!open) return null;

  const positions: Record<string, string> = {
    bottom: "bottom-0 left-0 right-0 rounded-t-2xl max-h-[85vh]",
    top: "top-0 left-0 right-0 rounded-b-2xl max-h-[85vh]",
    left: "left-0 top-0 bottom-0 w-80",
    right: "right-0 top-0 bottom-0 w-80",
  };

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={() => setOpen(false)}
      />
      <div
        className={`fixed z-50 overflow-y-auto p-6 shadow-lg ${positions[side]} ${className}`}
        role="dialog"
        aria-modal="true"
      >
        {children}
      </div>
    </>,
    document.body
  );
}

export function SheetHeader({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-1.5 ${className}`}>{children}</div>;
}

export function SheetTitle({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <h2 className={`text-lg font-semibold ${className}`}>{children}</h2>;
}
