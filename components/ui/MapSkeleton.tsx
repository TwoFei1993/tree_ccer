export function MapSkeleton({ heightClassName = "h-[70vh]" }: { heightClassName?: string }) {
  return (
    <div
      className={`${heightClassName} w-full animate-pulse rounded-md border border-stone-300 bg-stone-100`}
      role="status"
      aria-label="地图加载中"
    >
      <div className="flex h-full items-center justify-center text-sm text-stone-400">
        加载地理数据中…
      </div>
    </div>
  );
}
