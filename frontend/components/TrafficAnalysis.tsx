"use client";

import { useEffect, useState } from "react";

export default function TrafficAnalysis() {
  const [bars, setBars] = useState<number[]>(Array(12).fill(20));

  useEffect(() => {
    const int = setInterval(() => {
      setBars(prev => {
        const next = [...prev.slice(1), Math.floor(Math.random() * 80) + 10];
        return next;
      });
    }, 1500);
    return () => clearInterval(int);
  }, []);

  return (
    <div className="panel border-t-2 border-t-amber bg-panel/60">
      <h3 className="text-tactical font-mono font-bold mb-3 uppercase tracking-widest text-sm border-b border-tactical/30 pb-2 flex justify-between">
        <span>Encrypted Traffic</span>
        <span className="text-[10px] bg-amber/20 text-amber px-2 py-0.5 rounded">MONITORING</span>
      </h3>
      <div className="flex items-end h-24 gap-1 mt-4">
        {bars.map((val, i) => (
          <div key={i} className="flex-1 bg-black rounded-t relative group">
            <div 
              className={`absolute bottom-0 w-full rounded-t transition-all duration-500 ${val > 70 ? 'bg-amber' : 'bg-tactical/60'}`}
              style={{ height: `${val}%` }}
            ></div>
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-2 text-[9px] font-mono text-tactical/50">
        <span>T-60s</span>
        <span>LIVE</span>
      </div>
    </div>
  );
}
