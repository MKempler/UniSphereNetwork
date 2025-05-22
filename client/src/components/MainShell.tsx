import React from "react";

interface MainShellProps {
  leftNav?: React.ReactNode;
  rightAside?: React.ReactNode;
  children: React.ReactNode;
}

const MainShell: React.FC<MainShellProps> = ({ leftNav, rightAside, children }) => (
  <div className="flex justify-center lg:gap-0 bg-white min-h-screen">
    {/* Left Navigation - only visible on lg+ */}
    {leftNav && (
      <aside className="hidden lg:block flex-shrink-0 w-[260px] sticky top-0 h-screen bg-neutral-50 border-r border-neutral-200 dark:bg-neutral-900 dark:border-neutral-800" role="navigation" aria-label="Main navigation">
        {leftNav}
      </aside>
    )}
    <div className="flex flex-1 max-w-screen-xl">
      <main className="flex-1 px-6 py-4 min-w-0" tabIndex={-1}>
      {children}
    </main>
        {rightAside}
    </div>
  </div>
);

export default MainShell; 