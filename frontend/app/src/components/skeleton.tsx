export function SkeletonText({ className = undefined }: { className?: string }) {
  return (
    <div className={`inline-block bg-gray-200 rounded animate-pulse h-2 ${className}`} />
  );
}

export function SkeletonImage({ className = undefined }: { className?: string }) {
  return (
    <div className={`inline-block bg-gray-200 rounded-full animate-pulse ${className}`} />
  );
}
