export default function Loading() {
  return (
    <div className="space-y-3 animate-pulse" aria-busy="true">
      <div className="h-8 w-64 rounded-lg bg-leaf-100" />
      <div className="h-32 rounded-2xl bg-leaf-50" />
      <div className="h-32 rounded-2xl bg-leaf-50" />
    </div>
  );
}
