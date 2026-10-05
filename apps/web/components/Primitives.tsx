"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-neutral-800/70 rounded ${className}`} />;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="border border-dashed border-neutral-800 rounded-lg py-14 flex flex-col items-center justify-center text-center px-6">
      <p className="text-[14px] text-neutral-300 font-medium mb-1">{title}</p>
      {description && <p className="text-[13px] text-neutral-500 mb-4 max-w-sm">{description}</p>}
      {action}
    </div>
  );
}
