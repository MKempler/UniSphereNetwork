import React from "react";

interface MainShellProps {
  leftNav?: React.ReactNode;
  rightAside?: React.ReactNode;
  children: React.ReactNode;
}

const MainShell: React.FC<MainShellProps> = ({ leftNav, rightAside, children }) => (
  <div className="max-w-[1280px] mx-auto flex flex-col gap-6 lg:flex-row lg:gap-8 px-4 sm:px-6">
    {/* Left Navigation - only visible on lg+ */}
    {leftNav && (
      <aside className="hidden lg:block flex-shrink-0 w-[240px] sticky top-0 h-screen" role="navigation" aria-label="Main navigation">
        {leftNav}
      </aside>
    )}
    {/* Main Content */}
    <main className="flex-1 min-w-0" tabIndex={-1}>
      {children}
    </main>
    {/* Right Sidebar - only visible on xl+ */}
    {rightAside && (
      <aside className="hidden xl:block flex-shrink-0 w-[320px]" role="complementary" aria-label="Right sidebar">
        {rightAside}
      </aside>
    )}
  </div>
);

export default MainShell; 