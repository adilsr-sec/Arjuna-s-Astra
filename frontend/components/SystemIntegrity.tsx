"use client";

import { useEffect, useState } from "react";

export default function SystemIntegrity() {
  const [entropy, setEntropy] = useState(99.4);
  const [latency, setLatency] = useState(14);

  useEffect(() => {
    const int = setInterval(() => {
      setEntropy(99 + Math.random() * 0.9);
      setLatency(12 + Math.floor(Math.random() * 8));
    }, 2000);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="panel border-t-2 border-t-tactical bg-panel/60">
      <h3 className="text-tactical font-mono font-bold mb-3 uppercase tracking-widest text-sm border-b border-tactical/30 pb-2 flex justify-between">
        <span>System Integrity</span>
        <span className="text-[10px] bg-tactical text-black px-2 py-0.5 rounded animate-pulse">SECURE</span>
      </h3>
      
      <div className="space-y-4 font-mono text-xs">
        <div>
          <div className="flex justify-between text-tactical/80 mb-1">
            <span>AES-256 ENCRYPTION ENTROPY</span>
            <span className="text-tactical">{entropy.toFixed(2)}%</span>
          </div>
          <div className="w-full bg-black h-1.5 rounded overflow-hidden">
            <div className="bg-tactical h-full" style={{ width: `${entropy}%` }}></div>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-tactical/80 mb-1">
            <span>UPLINK LATENCY</span>
            <span className={latency > 18 ? 'text-amber' : 'text-tactical'}>{latency}ms</span>
          </div>
          <div className="w-full bg-black h-1.5 rounded overflow-hidden">
            <div className={`h-full ${latency > 18 ? 'bg-amber' : 'bg-tactical'}`} style={{ width: `${(latency / 30) * 100}%` }}></div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-tactical/10">
          <div className="bg-black/40 p-2 border border-tactical/20 text-center">
            <div className="text-[9px] text-tactical/60 mb-1">KEY ROTATION</div>
            <div className="text-tactical font-bold">ACTIVE</div>
          </div>
          <div className="bg-black/40 p-2 border border-tactical/20 text-center">
            <div className="text-[9px] text-tactical/60 mb-1">TAMPER DETECT</div>
            <div className="text-tactical font-bold">ARMED</div>
          </div>
        </div>
      </div>
    </div>
  );
}
