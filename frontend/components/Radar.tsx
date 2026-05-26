export default function Radar() {
  return (
    <div className="panel h-52 relative overflow-hidden">
      <h3 className="text-neon font-semibold">Security Radar</h3>
      <div className="absolute inset-6 rounded-full border border-neon/30" />
      <div className="absolute inset-12 rounded-full border border-neon/20" />
      <div className="absolute inset-3 rounded-full border border-neon/10 animate-sweep origin-center" />
      <div className="absolute inset-0 flex items-center justify-center text-xs text-accent">
        Threat Surface Scan: NORMAL
      </div>
    </div>
  );
}
