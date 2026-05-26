"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { API } from "../lib/api";
import { saveSession } from "../lib/session";

export default function HomePage() {
  const router = useRouter();
  const [loginUser, setLoginUser] = useState("admin");
  const [loginPass, setLoginPass] = useState("Admin@123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [typedText, setTypedText] = useState("");

  const fullText = "INITIALIZING SECURE UPLINK...\nESTABLISHING ENCRYPTED TUNNEL...\nCONNECTION SECURED.";

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      setTypedText(fullText.slice(0, index));
      index++;
      if (index > fullText.length) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, []);

  async function login() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUser, password: loginPass })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");
      saveSession({
        token: data.access_token,
        role: data.role,
        username: loginUser,
        department: data.department
      });
      if (data.role === "Admin") router.push("/admin");
      else if (data.role === "Department") router.push("/department");
      else router.push("/soldier");
    } catch (e: any) {
      setError(e?.message || "Authentication failed. Access denied.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden">
      {/* Scanline overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%] z-10 opacity-40 mix-blend-overlay"></div>
      <div className="absolute w-full h-1 bg-tactical/20 blur-[1px] animate-scanline z-20 pointer-events-none"></div>

      <div className="max-w-xl w-full space-y-6 relative z-30">
        <div className="panel border-t-4 border-t-amber bg-command shadow-2xl">
          <div className="flex justify-between items-center mb-6 border-b border-tactical/30 pb-2">
            <h1 className="text-3xl font-bold text-tactical tracking-widest drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]">
              ARJUNA&apos;S ARROW
            </h1>
            <span className="bg-amber text-black font-bold px-2 py-1 text-[10px] animate-pulse">CLASSIFIED</span>
          </div>

          <div className="h-20 mb-2 font-mono text-xs text-tactical/80 whitespace-pre-wrap">
            {typedText}
            <span className="animate-blink border-r-2 border-tactical ml-1"></span>
          </div>

          <p className="text-amber font-mono text-xs mb-6 uppercase tracking-widest border border-amber/30 bg-amber/10 p-2 text-center">
            Warning: Unauthorized access strictly prohibited.<br/>All activities are monitored and logged.
          </p>

          <section className="space-y-4">
            <div>
              <label className="block text-[10px] font-mono text-tactical/70 mb-1">OPERATIVE ID</label>
              <input 
                className="w-full bg-panel p-3 rounded-none border border-tactical/50 focus:border-tactical focus:ring-1 focus:ring-tactical outline-none text-tactical font-mono transition-all" 
                value={loginUser} 
                onChange={(e) => setLoginUser(e.target.value)} 
                placeholder="Enter Operative ID"
              />
            </div>
            <div>
              <label className="block text-[10px] font-mono text-tactical/70 mb-1">PASSPHRASE</label>
              <input 
                className="w-full bg-panel p-3 rounded-none border border-tactical/50 focus:border-tactical focus:ring-1 focus:ring-tactical outline-none text-tactical font-mono transition-all" 
                type="password" 
                value={loginPass} 
                onChange={(e) => setLoginPass(e.target.value)} 
                placeholder="••••••••"
              />
            </div>
            
            <button 
              className="w-full bg-tactical text-black font-bold font-mono tracking-widest rounded-none p-4 hover:bg-tactical/90 hover:shadow-[0_0_15px_rgba(74,222,128,0.4)] transition-all uppercase mt-2 relative overflow-hidden group" 
              onClick={login}
            >
              <span className="relative z-10">{loading ? "AUTHENTICATING..." : "INITIATE SECURE HANDSHAKE"}</span>
              <div className="absolute inset-0 h-full w-0 bg-white/20 group-hover:w-full transition-all duration-300 ease-out z-0"></div>
            </button>
            
            {error && (
              <p className="text-red-500 font-mono text-sm text-center border border-red-500/30 bg-red-500/10 p-2 mt-4">
                [ERROR]: {error}
              </p>
            )}
          </section>

          <div className="mt-8 pt-4 border-t border-tactical/20 flex justify-between text-[10px] text-tactical/50 font-mono">
            <span>SYS.VERSION: 4.2.1-MIL</span>
            <span>SECURE AUDIO PROTOCOL: ACTIVE</span>
          </div>
        </div>
      </div>
    </main>
  );
}
