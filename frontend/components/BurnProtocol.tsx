"use client";

import { useState } from "react";
import { API } from "../lib/api";
import { clearSession } from "../lib/session";
import { useRouter } from "next/navigation";

export default function BurnProtocol({ session }: { session: any }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [burning, setBurning] = useState(false);

  const initiateBurn = async () => {
    if (!session) return;
    setBurning(true);
    try {
      await fetch(`${API}/security/burn`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
      });
      // Clear session locally
      clearSession();
      // Add a visual delay for effect
      setTimeout(() => {
        router.push("/?error=" + encodeURIComponent("TERMINAL LOCKED: BURN PROTOCOL ENGAGED"));
      }, 1500);
    } catch (e) {
      console.error(e);
      setBurning(false);
      setConfirming(false);
    }
  };

  return (
    <div className="panel flex flex-col items-center justify-center p-4 border-red-500/30">
      <h3 className="text-red-500 font-bold mb-4 uppercase tracking-widest text-sm">Emergency Protocol</h3>
      
      {!confirming && !burning && (
        <button 
          onClick={() => setConfirming(true)}
          className="bg-red-900/40 border-2 border-red-500 text-red-500 font-bold uppercase tracking-wider py-3 px-6 rounded hover:bg-red-800/60 hover:text-white transition-all shadow-[0_0_15px_rgba(239,68,68,0.5)]"
        >
          Initiate Burn
        </button>
      )}

      {confirming && !burning && (
        <div className="flex flex-col items-center animate-pulse">
          <p className="text-red-400 text-xs mb-3 text-center uppercase">Warning: This will permanently lock terminal and broadcast distress signal.</p>
          <div className="flex gap-4">
            <button 
              onClick={() => setConfirming(false)}
              className="bg-command border border-gray-500 text-gray-300 py-2 px-4 rounded hover:bg-gray-800 text-sm"
            >
              Abort
            </button>
            <button 
              onDoubleClick={initiateBurn}
              className="bg-red-600 border border-red-400 text-white font-bold py-2 px-4 rounded hover:bg-red-500 text-sm animate-bounce"
            >
              Double-Click to Confirm
            </button>
          </div>
        </div>
      )}

      {burning && (
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <p className="text-red-500 font-bold animate-pulse">PURGING TERMINAL...</p>
        </div>
      )}
    </div>
  );
}
