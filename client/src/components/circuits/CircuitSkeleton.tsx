import React from 'react';

const CircuitSkeleton = () => (
  <div className="flex flex-col rounded-2xl bg-white shadow border border-neutral-100 overflow-hidden animate-pulse" role="listitem">
    <div className="h-8 w-full bg-neutral-100" />
    <div className="flex-1 flex flex-col p-4">
      <div className="h-6 w-2/3 bg-neutral-100 rounded mb-2" />
      <div className="h-4 w-full bg-neutral-100 rounded mb-1" />
      <div className="h-4 w-5/6 bg-neutral-100 rounded mb-4" />
      <div className="flex items-center gap-2 mt-auto mb-3">
        <div className="w-7 h-7 rounded-full bg-neutral-100" />
        <div className="h-3 w-16 bg-neutral-100 rounded" />
        <div className="h-3 w-10 bg-neutral-100 rounded ml-2" />
      </div>
      <div className="h-8 w-full bg-neutral-100 rounded-full" />
    </div>
  </div>
);

export default CircuitSkeleton; 