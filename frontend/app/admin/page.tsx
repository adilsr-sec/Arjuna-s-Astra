"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "../../lib/api";
import { clearSession, getSession } from "../../lib/session";
import { AuthorizedImage, AuthorizedLink } from "../../components/AuthorizedMedia";
import TransmissionFlow from "../../components/TransmissionFlow";
import LiveAudioRecorder from "../../components/LiveAudioRecorder";

export default function AdminDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [newSoldier, setNewSoldier] = useState({ username: "", password: "", department: "" });
  const [newDepartment, setNewDepartment] = useState({ username: "", password: "", department_name: "" });
  
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editData, setEditData] = useState<{ department: string, locked: boolean, password?: string }>({ department: "", locked: false, password: "" });
  
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [stegoImage, setStegoImage] = useState<File | null>(null);
  const [seed, setSeed] = useState(1337);
  const [decodePhase, setDecodePhase] = useState(-1);
  const [decodeResult, setDecodeResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const [audioInputMode, setAudioInputMode] = useState<"file" | "live">("file");
  const [audio, setAudio] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [decodePassword, setDecodePassword] = useState("");
  const [encodeRecipient, setEncodeRecipient] = useState("");
  const [liveSpecPath, setLiveSpecPath] = useState("");
  const [liveSpecLoading, setLiveSpecLoading] = useState(false);
  const [showSpec, setShowSpec] = useState(false);
  const [transmissionPhase, setTransmissionPhase] = useState(-1);
  const [launchSuccess, setLaunchSuccess] = useState("");
  const [inbox, setInbox] = useState<any[]>([]);
  const [message, setMessage] = useState({ to_user: "", body: "" });
  const [contacts, setContacts] = useState<Array<{ username: string; role: string; department?: string | null }>>([]);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "Admin") return router.push("/");
    setSession(s);
    fetchData(s.token);
    fetchContacts(s.token);
    fetchInbox(s.token);
  }, [router]);

  async function fetchData(token?: string) {
    const t = token || session?.token;
    if (!t) return;
    try {
      const [uRes, lRes] = await Promise.all([
        fetch(`${API}/org/users`, { headers: { Authorization: `Bearer ${t}` } }),
        fetch(`${API}/mission/logs`, { headers: { Authorization: `Bearer ${t}` } })
      ]);
      setUsers(await uRes.json());
      setLogs(await lRes.json());
    } catch (e) {
      console.error(e);
    }
  }

  const authHeader = session ? { Authorization: `Bearer ${session.token}` } : undefined;

  async function addSoldier() {
    if (!newSoldier.username.trim() || !newSoldier.password.trim() || !newSoldier.department.trim()) {
      setError("All fields are required to provision a soldier.");
      return;
    }
    setError(""); setSuccess("");
    const res = await fetch(`${API}/org/soldiers`, {
      method: "POST",
      headers: { ...(authHeader || {}), "Content-Type": "application/json" },
      body: JSON.stringify(newSoldier)
    });
    if (res.ok) {
      setSuccess(`Soldier ${newSoldier.username} added successfully.`);
      setNewSoldier({ username: "", password: "", department: "" });
      fetchData();
    } else {
      const d = await res.json();
      setError(d.detail || "Failed to add soldier");
    }
  }

  async function addDepartment() {
    if (!newDepartment.username.trim() || !newDepartment.password.trim() || !newDepartment.department_name.trim()) {
      setError("All fields are required to provision a department.");
      return;
    }
    setError(""); setSuccess("");
    const res = await fetch(`${API}/org/departments`, {
      method: "POST",
      headers: { ...(authHeader || {}), "Content-Type": "application/json" },
      body: JSON.stringify(newDepartment)
    });
    if (res.ok) {
      setSuccess(`Department ${newDepartment.department_name} added successfully.`);
      setNewDepartment({ username: "", password: "", department_name: "" });
      fetchData();
    } else {
      const d = await res.json();
      setError(d.detail || "Failed to add department");
    }
  }

  async function saveUserEdit(username: string) {
    setError(""); setSuccess("");
    const res = await fetch(`${API}/org/users/${username}`, {
      method: "PUT",
      headers: { ...(authHeader || {}), "Content-Type": "application/json" },
      body: JSON.stringify(editData)
    });
    if (res.ok) {
      setSuccess(`User ${username} updated successfully.`);
      setEditingUser(null);
      fetchData();
    } else {
      const d = await res.json();
      setError(d.detail || "Failed to update user");
    }
  }

  async function deleteUser(username: string) {
    if (!session) return;
    if (!confirm(`Are you sure you want to permanently delete user ${username}?`)) return;
    setError(""); setSuccess("");
    try {
      const res = await fetch(`${API}/org/users/${username}`, {
        method: "DELETE",
        headers: authHeader
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Delete user failed");
      setSuccess(`User ${username} deleted successfully.`);
      fetchData();
    } catch (e: any) {
      setError(e?.message || "Delete user failed");
    }
  }

  async function decryptSignal() {
    if (!session) return setError("Session expired. Please login again.");
    if (!stegoImage) return setError("Select a stego image to decode.");
    setBusy(true);
    setError("");
    setDecodePhase(-1);
    setDecodeResult(null);
    const fd = new FormData();
    fd.append("image", stegoImage);
    fd.append("seed", String(seed));
    fd.append("use_password", decodePassword ? "true" : "false");
    fd.append("password", decodePassword);
    try {
      const res = await fetch(`${API}/decode`, { method: "POST", headers: authHeader, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Decode failed");
      
      setDecodeResult(data);
      setDecodePhase(1);
      
      setTimeout(() => {
        setDecodePhase(2);
      }, 2500);
      
    } catch (e: any) {
      setError(e?.message || "Decrypt Signal failed");
    } finally {
      setBusy(false);
    }
  }

  async function fetchContacts(token?: string) {
    const t = token || session?.token;
    if (!t) return;
    const res = await fetch(`${API}/comms/contacts`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (Array.isArray(data)) setContacts(data);
  }

  async function fetchInbox(token?: string) {
    const t = token || session?.token;
    if (!t) return;
    const res = await fetch(`${API}/comms/inbox`, { headers: { Authorization: `Bearer ${t}` } });
    const data = await res.json();
    if (Array.isArray(data)) setInbox(data);
  }

  async function handleAudioChange(file: File | null) {
    setAudio(file);
    setLiveSpecPath("");
    if (!file || !session) return;
    setLiveSpecLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("audio", file);
      const res = await fetch(`${API}/preview/spectrogram`, { method: "POST", headers: authHeader, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Spectrogram preview failed");
      setLiveSpecPath(data.spectrogram_image || "");
    } catch (e: any) {
      setError(e?.message || "Could not generate live spectrogram preview");
    } finally {
      setLiveSpecLoading(false);
    }
  }

  async function launchTransmission() {
    if (!session) return setError("Session expired. Please login again.");
    if (!audio || !coverImage) return setError("Select both audio and cover image.");
    setBusy(true);
    setError("");
    setLaunchSuccess("");
    
    const simulatePipeline = async () => {
      for (let i = 0; i < 4; i++) {
        setTransmissionPhase(i);
        await new Promise(r => setTimeout(r, 600));
      }
    };
    const pipelinePromise = simulatePipeline();
    try {
      const fd = new FormData();
      fd.append("audio", audio);
      fd.append("image", coverImage);
      fd.append("seed", String(seed));
      fd.append("to_user", encodeRecipient);
      fd.append("use_password", password ? "true" : "false");
      fd.append("password", password);
      const res = await fetch(`${API}/encode`, { method: "POST", headers: authHeader, body: fd });
      const data = await res.json();
      await pipelinePromise;
      if (!res.ok) throw new Error(data.detail || "Encode failed");
      setTransmissionPhase(4);
      setResult(data);
      setShowSpec(Boolean(data.spectrogram_image));
      setLaunchSuccess(`Transmission successfully ${encodeRecipient ? `delivered to ${encodeRecipient}` : 'encoded locally'}`);
      setTimeout(() => setTransmissionPhase(-1), 3000);
    } catch (e: any) {
      setTransmissionPhase(-1);
      setError(e?.message || "Launch Transmission failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendMessage() {
    if (!session) return setError("Session expired. Please login again.");
    if (!message.to_user.trim() || !message.body.trim()) return setError("Recipient and message are required.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/comms/send`, {
        method: "POST",
        headers: { ...(authHeader || {}), "Content-Type": "application/json" },
        body: JSON.stringify(message)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Send failed");
      setResult(data);
      setMessage(p => ({...p, body: ""}));
      fetchInbox();
    } catch (e: any) {
      setError(e?.message || "Send failed");
    } finally {
      setBusy(false);
    }
  }

  // Group users by department for the hierarchy view
  const departmentsMap = users.reduce((acc, user) => {
    if (user.role === "Admin") return acc;
    const dept = user.department || "Unassigned";
    if (!acc[dept]) acc[dept] = { head: null, soldiers: [] };
    if (user.role === "Department") acc[dept].head = user;
    else acc[dept].soldiers.push(user);
    return acc;
  }, {} as Record<string, { head: any, soldiers: any[] }>);

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="panel flex items-center justify-between border-t-4 border-t-amber bg-black/40">
          <div>
            <h1 className="text-2xl text-tactical font-mono tracking-widest font-bold">GLOBAL COMMAND & CONTROL</h1>
            <p className="text-[10px] text-tactical/60 font-mono tracking-widest mt-1">ADMINISTRATIVE OVERRIDE GRANTED</p>
          </div>
          <button className="bg-amber text-black hover:bg-amber/80 font-bold font-mono text-xs px-4 py-2 transition-colors uppercase tracking-widest" onClick={() => { clearSession(); router.push("/"); }}>DISCONNECT</button>
        </header>

        {error && <div className="p-3 bg-red-500/10 border border-red-500/50 text-red-500 font-mono text-sm uppercase tracking-widest">[ERROR] {error}</div>}
        {success && <div className="p-3 bg-tactical/10 border border-tactical/50 text-tactical font-mono text-sm uppercase tracking-widest">[SUCCESS] {success}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="space-y-6">
            <section className="panel space-y-3 border-t-2 border-t-tactical bg-panel/60">
              <h2 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2">Provision Department</h2>
              <input className="w-full bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors" placeholder="Dept HQ Username (e.g. intel_hq)" value={newDepartment.username} onChange={(e) => setNewDepartment((p) => ({ ...p, username: e.target.value }))} />
              <input className="w-full bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors" type="password" placeholder="Passphrase" value={newDepartment.password} onChange={(e) => setNewDepartment((p) => ({ ...p, password: e.target.value }))} />
              <input className="w-full bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors" placeholder="Department Name (e.g. Intel)" value={newDepartment.department_name} onChange={(e) => setNewDepartment((p) => ({ ...p, department_name: e.target.value }))} />
              <button className="w-full bg-tactical/20 border border-tactical text-tactical hover:bg-tactical hover:text-black rounded-none px-3 py-2 font-mono font-bold text-xs uppercase transition-all" onClick={addDepartment}>Create Department</button>
            </section>

            <section className="panel space-y-3 border-t-2 border-t-amber bg-panel/60">
              <h2 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2">Provision Soldier</h2>
              <input className="w-full bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors" placeholder="Soldier Username" value={newSoldier.username} onChange={(e) => setNewSoldier((p) => ({ ...p, username: e.target.value }))} />
              <input className="w-full bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors" type="password" placeholder="Passphrase" value={newSoldier.password} onChange={(e) => setNewSoldier((p) => ({ ...p, password: e.target.value }))} />
              <select className="w-full bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors text-tactical" value={newSoldier.department} onChange={(e) => setNewSoldier((p) => ({ ...p, department: e.target.value }))}>
                <option value="">Select Department...</option>
                {Object.keys(departmentsMap).map(dept => <option key={dept} value={dept}>{dept}</option>)}
              </select>
              <button className="w-full bg-amber/20 border border-amber text-amber hover:bg-amber hover:text-black rounded-none px-3 py-2 font-mono font-bold text-xs uppercase transition-all" onClick={addSoldier}>Create Soldier</button>
            </section>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <section className="panel space-y-4 border-t-2 border-t-tactical bg-panel/60 min-h-[400px]">
              <h2 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2">Hierarchy Management</h2>
              
              <div className="space-y-6 font-mono">
                {Object.entries(departmentsMap).map(([deptName, group]: [string, any]) => (
                  <div key={deptName} className="border border-tactical/20 bg-black/40 p-4 relative">
                    <div className="absolute top-0 left-0 w-1 h-full bg-tactical"></div>
                    <h3 className="text-amber font-bold text-lg mb-3 tracking-widest uppercase">[{deptName}] COMMAND</h3>
                    
                    {group.head ? (
                      <div className="mb-4 bg-tactical/5 p-3 border border-tactical/10">
                        <div className="flex justify-between items-center">
                          <div>
                            <span className="text-[10px] text-tactical/50 mr-2">DEPT. HEAD</span>
                            <span className="text-tactical font-bold">{group.head.username}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {group.head.locked && <span className="text-[10px] bg-red-500/20 text-red-500 px-1 py-0.5 animate-pulse border border-red-500/50">LOCKED</span>}
                            <button 
                              className="text-[10px] bg-command border border-tactical/30 text-tactical px-2 py-1 hover:bg-tactical/20"
                              onClick={() => { setEditingUser(group.head.username); setEditData({ department: group.head.department, locked: group.head.locked, password: "" }); }}
                            >EDIT</button>
                            <button 
                              className="text-[10px] bg-red-900/20 border border-red-500/30 text-red-400 px-2 py-1 hover:bg-red-900/50"
                              onClick={() => deleteUser(group.head.username)}
                            >DELETE</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="mb-4 text-[10px] text-amber/50 italic p-2 bg-amber/5 border border-amber/10">NO DEPARTMENT HEAD ASSIGNED</div>
                    )}

                    <div className="pl-4 border-l border-tactical/20 space-y-2">
                      <div className="text-[10px] text-tactical/50 mb-2">ASSIGNED OPERATIVES</div>
                      {group.soldiers.length === 0 && <div className="text-[10px] text-tactical/30 italic">No operatives deployed in this sector.</div>}
                      {group.soldiers.map((soldier: any) => (
                        <div key={soldier.username} className="flex justify-between items-center bg-command/50 p-2 border border-tactical/5">
                          <div className="flex items-center gap-2">
                            <span className={`w-1.5 h-1.5 rounded-full ${soldier.locked ? 'bg-red-500' : 'bg-tactical'}`}></span>
                            <span className="text-tactical/80 text-sm">{soldier.username}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {soldier.locked && <span className="text-[10px] bg-red-500/20 text-red-500 px-1 py-0.5 animate-pulse border border-red-500/50">LOCKED</span>}
                            <button 
                              className="text-[10px] bg-command border border-tactical/30 text-tactical px-2 py-1 hover:bg-tactical/20"
                              onClick={() => { setEditingUser(soldier.username); setEditData({ department: soldier.department, locked: soldier.locked, password: "" }); }}
                            >EDIT</button>
                            <button 
                              className="text-[10px] bg-red-900/20 border border-red-500/30 text-red-400 px-2 py-1 hover:bg-red-900/50"
                              onClick={() => deleteUser(soldier.username)}
                            >DELETE</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            
            <section className="panel space-y-3 border-t-2 border-t-tactical bg-panel/60">
              <h2 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2">Decode Intercepted Signal</h2>
              <input className="w-full bg-command p-2 rounded border border-tactical/30 font-mono text-xs focus:border-tactical outline-none text-tactical" type="file" accept=".png,.jpg,.jpeg,image/*" onChange={(e) => setStegoImage(e.target.files?.[0] || null)} />
              <input className="w-full bg-command p-2 rounded border border-tactical/30 font-mono text-xs focus:border-tactical outline-none text-tactical" placeholder="Password lock (if used during encode)" value={decodePassword} onChange={(e) => setDecodePassword(e.target.value)} />
              <input className="w-full bg-command p-2 rounded border border-tactical/30 font-mono text-xs focus:border-tactical outline-none text-tactical" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
              <button className="w-full bg-tactical/20 border border-tactical text-tactical hover:bg-tactical hover:text-black rounded-none px-3 py-2 font-mono font-bold text-xs uppercase transition-all disabled:opacity-60" disabled={busy} onClick={decryptSignal}>Decrypt Signal</button>
              
              {decodePhase >= 1 && decodeResult?.spectrogram_image && (
                <div className="mt-4 p-3 border border-tactical/30 bg-black/50">
                  <p className="text-tactical font-mono text-xs mb-2 uppercase tracking-widest">Analyzing Signal Spectrogram...</p>
                  <AuthorizedImage
                    alt="Decoded spectrogram"
                    className="w-full rounded mb-3 animate-pulse border border-tactical/30"
                    src={`${API}/download/stego?path=${encodeURIComponent(decodeResult.spectrogram_image)}`}
                    token={session.token}
                  />
                  
                  {decodePhase === 1 && (
                    <p className="text-[10px] text-amber animate-pulse font-mono uppercase tracking-widest">Deconstructing audio from visual frequencies...</p>
                  )}
                  {decodePhase === 2 && decodeResult?.audio_file && (
                    <div className="mt-3 pt-3 border-t border-tactical/30">
                      <p className="text-green-400 text-xs font-mono mb-2 uppercase tracking-widest">✓ Audio Deconstruction Complete</p>
                      <AuthorizedLink
                        className="bg-tactical text-black px-3 py-2 font-bold font-mono text-[10px] uppercase tracking-widest inline-block hover:bg-tactical/80 transition-colors"
                        href={`${API}/download/audio?path=${encodeURIComponent(decodeResult.audio_file)}`}
                        token={session.token}
                      >
                        Download Reconstructed Audio
                      </AuthorizedLink>
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>
        </div>

        {/* Mission Logs */}
        <section className="panel space-y-3 border-t-2 border-t-tactical bg-panel/60">
          <h2 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2 flex justify-between">
            <span>System Audit Logs</span>
            <span className="text-[10px] bg-tactical/20 px-2 py-0.5">AUTO-REFRESHING</span>
          </h2>
          <div className="max-h-64 overflow-y-auto font-mono text-[10px] bg-black/60 p-2 border border-tactical/20 space-y-1">
            {logs.length === 0 ? <div className="text-tactical/30">No logs found.</div> : null}
            {[...logs].reverse().map((log, i) => (
              <div key={i} className="flex gap-4 text-tactical/70 hover:bg-tactical/10 p-1">
                <span className="text-amber/70 w-32 shrink-0">{log.ts?.replace('T', ' ').substring(0, 19) || 'Unknown Time'}</span>
                <span className="text-tactical font-bold w-32 shrink-0">{log.event}</span>
                <span className="w-32 shrink-0">ACTOR: {log.actor}</span>
                <span className={`w-20 shrink-0 ${log.status === 'SUCCESS' ? 'text-tactical' : 'text-red-500'}`}>{log.status}</span>
                <span className="text-tactical/50 truncate">{log.details}</span>
              </div>
            ))}
          </div>
        </section>

        {/* --- NEW COMMS SECTIONS --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <div className="space-y-6">
            <div className="panel">
                <TransmissionFlow activePhase={transmissionPhase} />
            </div>
            
            <section className="panel space-y-3 border-t-2 border-t-amber bg-panel/60">
              <div className="flex items-center justify-between">
                <h2 className="text-amber font-mono font-bold uppercase tracking-widest text-sm border-b border-amber/30 pb-2">Global Broadcast (Encode Message)</h2>
                <div className="flex bg-command border border-amber/30 rounded overflow-hidden">
                  <button 
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${audioInputMode === "file" ? "bg-amber text-black" : "text-amber hover:bg-amber/10"}`}
                    onClick={() => { setAudioInputMode("file"); handleAudioChange(null); }}
                  >File</button>
                  <button 
                    className={`px-3 py-1 text-xs font-semibold transition-colors ${audioInputMode === "live" ? "bg-tactical text-black" : "text-tactical hover:bg-tactical/10"}`}
                    onClick={() => { setAudioInputMode("live"); handleAudioChange(null); }}
                  >Live</button>
                </div>
              </div>
              {audioInputMode === "file" ? (
                <input className="w-full bg-command p-2 rounded-none border border-amber/30 font-mono text-xs focus:border-amber outline-none transition-colors text-tactical" type="file" accept=".wav,.mp3,audio/*" onChange={(e) => handleAudioChange(e.target.files?.[0] || null)} />
              ) : (
                <LiveAudioRecorder onRecordingComplete={(file) => handleAudioChange(file)} />
              )}
              <input className="w-full bg-command p-2 rounded-none border border-amber/30 font-mono text-xs focus:border-amber outline-none transition-colors text-tactical" type="file" accept=".png,.jpg,.jpeg,image/*" onChange={(e) => setCoverImage(e.target.files?.[0] || null)} />
              <select className="w-full bg-command p-2 rounded-none border border-amber/30 font-mono text-xs focus:border-amber outline-none transition-colors text-tactical" value={encodeRecipient} onChange={(e) => setEncodeRecipient(e.target.value)}>
                <option value="">Global Broadcast (Local Encode) / Select recipient</option>
                {contacts.map((c) => (
                  <option key={c.username} value={c.username}>
                    {c.username} ({c.role}{c.department ? ` - ${c.department}` : ""})
                  </option>
                ))}
              </select>
              <input className="w-full bg-command p-2 rounded-none border border-amber/30 font-mono text-xs focus:border-amber outline-none transition-colors text-tactical" placeholder="Optional password lock" value={password} onChange={(e) => setPassword(e.target.value)} />
              <input className="w-full bg-command p-2 rounded-none border border-amber/30 font-mono text-xs focus:border-amber outline-none transition-colors text-tactical" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
              <button className="w-full bg-amber/20 border border-amber text-amber hover:bg-amber hover:text-black rounded-none px-3 py-2 font-mono font-bold text-xs uppercase transition-all disabled:opacity-60" disabled={busy} onClick={launchTransmission}>Launch Transmission</button>
              {launchSuccess && <p className="text-green-400 text-sm font-semibold">✓ {launchSuccess}</p>}
              {liveSpecLoading && <p className="text-amber animate-pulse text-[10px] font-mono tracking-widest">Generating live spectrogram...</p>}
              {liveSpecPath && (
                <div className="mt-2">
                  <p className="text-[10px] text-amber font-mono tracking-widest mb-1 uppercase">Live Spectrogram Preview</p>
                  <AuthorizedImage
                    alt="Live spectrogram preview"
                    className="w-full h-auto min-h-[100px] rounded border border-amber/30"
                    src={`${API}/download/stego?path=${encodeURIComponent(liveSpecPath)}`}
                    token={session.token}
                  />
                </div>
              )}
            </section>
          </div>

          <section className="panel space-y-3 border-t-2 border-t-tactical bg-panel/60">
            <h2 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2">Global Comms & Intercepts</h2>
            <div className="flex gap-2 mb-2">
              <select className="flex-1 bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors text-tactical" value={message.to_user} onChange={(e) => setMessage((p) => ({ ...p, to_user: e.target.value }))}>
                <option value="">Select recipient</option>
                {contacts.map((c) => (
                  <option key={c.username} value={c.username}>
                    {c.username} ({c.role}{c.department ? ` - ${c.department}` : ""})
                  </option>
                ))}
              </select>
              <button className="bg-command border border-tactical/30 text-tactical hover:bg-tactical/20 px-3 py-2 text-[10px] font-mono uppercase tracking-widest" onClick={() => fetchContacts()}>Refresh Contacts</button>
            </div>
            <textarea className="w-full h-20 bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors text-tactical" placeholder="Type standard transmission..." value={message.body} onChange={(e) => setMessage((p) => ({ ...p, body: e.target.value }))} />
            <div className="flex justify-between items-center mb-4 border-b border-tactical/20 pb-4">
              <button className="bg-tactical/20 border border-tactical text-tactical hover:bg-tactical hover:text-black rounded-none px-6 py-2 font-mono font-bold text-xs uppercase transition-all disabled:opacity-60" disabled={busy} onClick={sendMessage}>Transmit</button>
              <button className="bg-command border border-tactical/30 text-tactical hover:bg-tactical/20 px-3 py-2 text-[10px] font-mono uppercase tracking-widest" onClick={() => fetchInbox()}>Refresh Intercepts</button>
            </div>
            
            <div className="space-y-2 max-h-96 overflow-y-auto">
              <h3 className="text-[10px] text-tactical/50 font-mono tracking-widest">INTERCEPTED NETWORK TRAFFIC</h3>
              {inbox.length === 0 && <div className="text-xs text-tactical/50 italic">No network traffic intercepted.</div>}
              {inbox.map((m, i) => (
                <div key={i} className="bg-black/60 p-3 border border-tactical/20 font-mono text-xs">
                  <div className="flex justify-between text-[10px] text-tactical/50 mb-2 border-b border-tactical/10 pb-1">
                    <span>FROM: <span className="text-amber/70 font-bold">{m.from}</span></span>
                    <span>TO: <span className="text-amber/70 font-bold">{m.to}</span></span>
                  </div>
                  <p className="text-tactical whitespace-pre-wrap">{m.body}</p>
                  
                  {m.type === "encoded_transmission" && m.stego_image && (
                    <div className="mt-3 pt-2 border-t border-tactical/10">
                      <span className="text-[10px] bg-amber/20 text-amber px-1 py-0.5 border border-amber/50 mr-2">ENCRYPTED ATTACHMENT</span>
                      <AuthorizedLink
                        className="text-tactical font-bold underline hover:text-tactical/80 text-[10px]"
                        href={`${API}/download/stego?path=${encodeURIComponent(m.stego_image)}`}
                        token={session.token}
                      >
                        DOWNLOAD STEGO IMAGE
                      </AuthorizedLink>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="panel w-full max-w-md border-t-4 border-t-amber bg-command shadow-2xl relative">
            <h2 className="text-amber font-mono font-bold uppercase tracking-widest text-lg border-b border-tactical/30 pb-2 mb-4">
              Edit Operative: {editingUser}
            </h2>
            <div className="space-y-4 font-mono">
              <div>
                <label className="block text-xs text-tactical/70 mb-1">REASSIGN DEPARTMENT</label>
                <select 
                  className="w-full bg-panel p-2 rounded-none border border-tactical/50 text-tactical outline-none"
                  value={editData.department}
                  onChange={(e) => setEditData({...editData, department: e.target.value})}
                >
                  <option value="">Unassigned</option>
                  {Object.keys(departmentsMap).map(dept => <option key={dept} value={dept}>{dept}</option>)}
                </select>
              </div>
              
              <div className="p-3 bg-black/50 border border-tactical/20 flex justify-between items-center">
                <div>
                  <div className="text-xs text-red-400 font-bold">BURN PROTOCOL (LOCK TERMINAL)</div>
                  <div className="text-[10px] text-tactical/50">Revoke all access immediately.</div>
                </div>
                <button 
                  className={`px-3 py-1 text-xs font-bold ${editData.locked ? 'bg-red-500 text-white' : 'bg-command border border-red-500/50 text-red-500'}`}
                  onClick={() => setEditData({...editData, locked: !editData.locked})}
                >
                  {editData.locked ? 'LOCKED' : 'UNLOCKED'}
                </button>
              </div>

              <div className="p-3 bg-black/50 border border-tactical/20">
                <div className="text-xs text-amber font-bold mb-2">TERMINAL RE-KEYING (PASSPHRASE OVERRIDE)</div>
                <div className="text-[10px] text-tactical/50 mb-2">Leave blank to keep current passphrase.</div>
                <input 
                  className="w-full bg-command p-2 rounded-none border border-tactical/50 text-tactical outline-none font-mono text-xs" 
                  type="password" 
                  placeholder="New Passphrase..." 
                  value={editData.password || ""} 
                  onChange={(e) => setEditData({...editData, password: e.target.value})} 
                />
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t border-tactical/20">
                <button className="flex-1 bg-command border border-tactical/50 text-tactical hover:bg-tactical/20 px-3 py-2 text-xs font-bold" onClick={() => setEditingUser(null)}>CANCEL</button>
                <button className="flex-1 bg-tactical text-black hover:bg-tactical/80 px-3 py-2 text-xs font-bold shadow-[0_0_10px_rgba(74,222,128,0.3)]" onClick={() => saveUserEdit(editingUser)}>SAVE OVERRIDE</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSpec && result?.spectrogram_image && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="panel max-w-3xl w-full border-t-4 border-t-amber bg-command shadow-2xl relative">
            <div className="flex items-center justify-between mb-3 border-b border-tactical/30 pb-2">
              <h3 className="text-amber font-mono font-bold uppercase tracking-widest text-lg">Generated Spectrogram</h3>
              <button className="bg-command border border-amber/30 text-amber hover:bg-amber/20 rounded px-3 py-1 font-mono text-xs uppercase" onClick={() => setShowSpec(false)}>Close</button>
            </div>
            <AuthorizedImage
              alt="Generated spectrogram"
              className="w-full h-auto min-h-[200px] rounded border border-amber/30"
              src={`${API}/download/stego?path=${encodeURIComponent(result.spectrogram_image)}`}
              token={session.token}
            />
          </div>
        </div>
      )}
    </main>
  );
}
