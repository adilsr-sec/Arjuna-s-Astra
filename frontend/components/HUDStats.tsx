"use client";

import { useEffect, useState } from "react";

export default function HUDStats() {
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setUptime(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  return (
    <div className="panel flex flex-col justify-center space-y-4 border-t-2 border-t-tactical bg-panel/60">
      <h3 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2 flex justify-between">
        <span>Terminal Telemetry</span>
        <span className="text-[10px] bg-red-500/20 text-red-500 px-2 py-0.5 rounded">DEFCON 3</span>
      </h3>
      
      <div className="grid grid-cols-2 gap-4 text-xs font-mono">
        <div className="bg-black/40 p-2 border border-tactical/10">
          <p className="text-tactical/50 text-[9px] mb-1">UPLINK STATUS</p>
          <p className="text-tactical font-bold flex items-center">
            <span className="w-1.5 h-1.5 rounded-full bg-tactical animate-pulse mr-2 shadow-[0_0_5px_#4ade80]"></span>
            ENCRYPTED
          </p>
        </div>
        
        <div className="bg-black/40 p-2 border border-tactical/10">
          <p className="text-tactical/50 text-[9px] mb-1">LOCAL TIME (ZULU)</p>
          <p className="text-tactical font-bold">{formatTime(uptime + 36000)}</p>
        </div>

        <div className="bg-black/40 p-2 border border-tactical/10">
          <p className="text-tactical/50 text-[9px] mb-1">ENVIRONMENT</p>
          <p className="text-tactical font-bold text-[10px]">TEMP: 24°C | ALT: 140m</p>
        </div>

        <div className="bg-black/40 p-2 border border-tactical/10">
          <p className="text-tactical/50 text-[9px] mb-1">GPS COORDINATES</p>
          <p className="text-amber font-bold blur-[2px] hover:blur-none transition-all cursor-crosshair">
            38°53'52"N
          </p>
        </div>
      </div>
    </div>
  );
}
