import { useRef, useState, cloneElement, isValidElement } from "react";

export function Menu({ open, onOpenChange, children }: { open: boolean, onOpenChange: (open: boolean) => void, children: React.ReactNode }) {
  // Find MenuButton and MenuList among children
  let button: React.ReactNode = null;
  let list: React.ReactNode = null;
  const rest: React.ReactNode[] = [];

  // Split children into button and list
  (Array.isArray(children) ? children : [children]).forEach(child => {
    if (isValidElement(child) && child.type && (child.type as any).displayName === 'MenuButton') {
      button = cloneElement(child, { onClick: () => onOpenChange(!open), 'aria-expanded': open });
    } else if (isValidElement(child) && child.type && (child.type as any).displayName === 'MenuList') {
      if (open) list = child;
    } else {
      rest.push(child);
    }
  });

  return <div style={{ position: "relative", display: "inline-block" }}>{button}{list}{rest}</div>;
}

export function MenuButton({ children, className, ...props }: any) {
  return (
    <button type="button" className={className} {...props}>
      {children}
    </button>
  );
}
MenuButton.displayName = 'MenuButton';

export function MenuList({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        position: "absolute",
        right: 0,
        marginTop: 8,
        minWidth: 160,
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
        zIndex: 1000,
      }}
      tabIndex={-1}
    >
      {children}
    </div>
  );
}
MenuList.displayName = 'MenuList';

export function MenuItem({ children, onClick, className }: { children: React.ReactNode, onClick?: () => void, className?: string }) {
  return (
    <button
      type="button"
      className={`w-full text-left px-4 py-2 text-sm hover:bg-neutral-100 focus:bg-neutral-100 rounded ${className || ""}`}
      onClick={onClick}
      style={{ background: "none", border: "none", cursor: "pointer" }}
    >
      {children}
    </button>
  );
}
MenuItem.displayName = 'MenuItem'; 