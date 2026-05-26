"use client";

const phases = ["Audio", "Signal", "Encryption", "Image", "Transmission"];

export default function TransmissionFlow({ activePhase = -1 }: { activePhase?: number }) {
  return (
    <div className="panel">
      <h3 className="text-neon font-semibold mb-3">Transmission Pipeline</h3>
      <div className="grid grid-cols-5 gap-3 text-center text-xs">
        {phases.map((phase, idx) => {
          const isActive = activePhase === idx;
          const isDone = activePhase > idx;
          return (
            <div key={phase} className={`relative border rounded-lg p-3 transition-colors duration-300 ${isActive ? 'border-neon bg-neon/10' : isDone ? 'border-green-500/50 bg-green-500/10' : 'border-accent/40 bg-command/60'}`}>
              <div className={`${isActive ? 'text-neon font-bold' : isDone ? 'text-green-400' : 'text-accent'}`}>{phase}</div>
              <div className={`mt-2 h-1 rounded ${isActive ? 'bg-neon animate-pulse' : isDone ? 'bg-green-500' : 'bg-neon/40 opacity-30'}`} />
              {idx < phases.length - 1 && (
                <div className={`absolute -right-3 top-1/2 -translate-y-1/2 ${isActive || isDone ? 'text-neon font-bold' : 'text-neon/30'}`}>{">>"}</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
