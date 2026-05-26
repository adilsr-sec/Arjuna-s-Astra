"use client";

export default function ActiveOperatives() {
  const ops = [
    { id: "ALPHA-1", status: "ACTIVE", coords: "34°05'22\"N 118°14'37\"W" },
    { id: "BRAVO-6", status: "RADIO_SILENCE", coords: "UNKNOWN" },
    { id: "CHARLIE-3", status: "ENGAGED", coords: "48°52'05\"N 2°19'59\"E" }
  ];

  return (
    <div className="panel border-t-2 border-t-tactical bg-panel/60">
      <h3 className="text-tactical font-mono font-bold mb-3 uppercase tracking-widest text-sm border-b border-tactical/30 pb-2">
        Active Field Operatives
      </h3>
      <div className="space-y-2 font-mono text-xs">
        {ops.map(op => (
          <div key={op.id} className="flex flex-col p-2 border border-tactical/10 bg-black/40">
            <div className="flex justify-between items-center mb-1">
              <span className="font-bold text-tactical/90">{op.id}</span>
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                op.status === 'ACTIVE' ? 'bg-tactical/10 text-tactical' : 
                op.status === 'ENGAGED' ? 'bg-red-500/10 text-red-500 animate-pulse' : 
                'bg-amber/10 text-amber'
              }`}>
                {op.status}
              </span>
            </div>
            <div className="flex justify-between text-[10px] text-tactical/50">
              <span>LOC:</span>
              <span>{op.coords}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
