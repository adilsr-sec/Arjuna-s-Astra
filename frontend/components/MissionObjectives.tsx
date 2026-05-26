"use client";

export default function MissionObjectives() {
  const objectives = [
    { id: 1, title: "Establish Secure Comm Link", status: "COMPLETED" },
    { id: 2, title: "Infiltrate Sector 7 Perimeter", status: "IN_PROGRESS" },
    { id: 3, title: "Extract Target Audio Intel", status: "PENDING" },
    { id: 4, title: "Execute Burn Protocol", status: "PENDING" }
  ];

  return (
    <div className="panel border-t-2 border-t-amber bg-panel/60">
      <h3 className="text-tactical font-mono font-bold mb-3 uppercase tracking-widest text-sm border-b border-tactical/30 pb-2 flex justify-between">
        <span>Mission Objectives</span>
        <span className="text-[10px] bg-tactical/20 px-2 py-0.5 rounded text-tactical">OP-VALKYRIE</span>
      </h3>
      <ul className="space-y-2 font-mono text-xs">
        {objectives.map(obj => (
          <li key={obj.id} className="flex items-center justify-between p-2 border border-tactical/10 bg-black/40">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                obj.status === 'COMPLETED' ? 'bg-tactical shadow-[0_0_5px_#4ade80]' : 
                obj.status === 'IN_PROGRESS' ? 'bg-amber animate-pulse shadow-[0_0_5px_#ffb703]' : 
                'bg-gray-600'
              }`}></span>
              <span className={obj.status === 'COMPLETED' ? 'text-tactical/50 line-through' : 'text-tactical/90'}>
                {obj.title}
              </span>
            </div>
            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
              obj.status === 'COMPLETED' ? 'bg-tactical/10 text-tactical' : 
              obj.status === 'IN_PROGRESS' ? 'bg-amber/10 text-amber' : 
              'bg-gray-800 text-gray-400'
            }`}>
              {obj.status}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
