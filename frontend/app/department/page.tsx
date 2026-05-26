"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "../../lib/api";
import { clearSession, getSession } from "../../lib/session";
import { AuthorizedImage, AuthorizedLink } from "../../components/AuthorizedMedia";
import TransmissionFlow from "../../components/TransmissionFlow";
import ActiveOperatives from "../../components/ActiveOperatives";
import TrafficAnalysis from "../../components/TrafficAnalysis";
import LiveAudioRecorder from "../../components/LiveAudioRecorder";

export default function DepartmentDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [audioInputMode, setAudioInputMode] = useState<"file" | "live">("file");
  const [seed, setSeed] = useState(1337);
  const [audio, setAudio] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [stegoImage, setStegoImage] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [decodePassword, setDecodePassword] = useState("");
  const [encodeRecipient, setEncodeRecipient] = useState("");
  const [liveSpecPath, setLiveSpecPath] = useState("");
  const [liveSpecLoading, setLiveSpecLoading] = useState(false);
  const [showSpec, setShowSpec] = useState(false);
  const [inbox, setInbox] = useState<any[]>([]);
  const [message, setMessage] = useState({ to_user: "", body: "" });
  const [contacts, setContacts] = useState<Array<{ username: string; role: string; department?: string | null }>>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [newSoldier, setNewSoldier] = useState({ username: "", password: "" });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState("");
  const [transmissionPhase, setTransmissionPhase] = useState(-1);
  const [decodePhase, setDecodePhase] = useState(-1);
  const [decodeResult, setDecodeResult] = useState<any>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "Department") return router.push("/");
    setSession(s);
  }, [router]);

  const authHeader = session ? { Authorization: `Bearer ${session.token}` } : undefined;

  useEffect(() => {
    if (!session) return;
    fetchContacts();
    fetchInbox();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  async function fetchUsers() {
    if (!session) return;
    try {
      const res = await fetch(`${API}/org/users`, { headers: authHeader });
      const data = await res.json();
      if (res.ok) setUsers(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    }
  }

  async function deleteUser(username: string) {
    if (!session) return;
    if (!confirm(`Are you sure you want to permanently delete operative ${username}?`)) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/org/users/${username}`, {
        method: "DELETE",
        headers: authHeader
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Delete user failed");
      fetchUsers();
    } catch (e: any) {
      setError(e?.message || "Delete user failed");
    } finally {
      setBusy(false);
    }
  }

  async function fetchContacts() {
    if (!session) return;
    const res = await fetch(`${API}/comms/contacts`, { headers: authHeader });
    const data = await res.json();
    if (Array.isArray(data)) setContacts(data);
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

  async function addSoldier() {
    if (!session) return setError("Session expired. Please login again.");
    if (!newSoldier.username.trim() || !newSoldier.password.trim()) return setError("Username and password are required.");
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`${API}/org/soldiers`, {
        method: "POST",
        headers: { ...(authHeader || {}), "Content-Type": "application/json" },
        body: JSON.stringify(newSoldier)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Add soldier failed");
      setResult(data);
      setNewSoldier({ username: "", password: "" });
      fetchUsers();
    } catch (e: any) {
      setError(e?.message || "Add soldier failed");
    } finally {
      setBusy(false);
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
      
      setResult(data);
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
    } catch (e: any) {
      setError(e?.message || "Send failed");
    } finally {
      setBusy(false);
    }
  }

  async function fetchInbox() {
    const res = await fetch(`${API}/comms/inbox`, { headers: authHeader });
    const data = await res.json();
    setInbox(Array.isArray(data) ? data : []);
  }

  return (
    <main className="min-h-screen p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="panel flex items-center justify-between border-t-4 border-t-amber bg-black/40">
          <div>
            <h1 className="text-2xl text-tactical font-mono tracking-widest font-bold">C2 COMMAND CENTER</h1>
            <p className="text-[10px] text-tactical/60 font-mono tracking-widest mt-1">DEPARTMENT LEVEL CLEARANCE</p>
          </div>
          <button className="bg-amber text-black hover:bg-amber/80 font-bold font-mono text-xs px-4 py-2 transition-colors uppercase tracking-widest" onClick={() => { clearSession(); router.push("/"); }}>DISCONNECT</button>
        </header>
        
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid md:grid-cols-2 gap-4">
              <ActiveOperatives />
              <TrafficAnalysis />
            </div>
            <div className="panel">
                <TransmissionFlow activePhase={transmissionPhase} />
            </div>
          </div>
          <div className="space-y-6">
            <section className="panel space-y-3 border-t-2 border-t-amber">
              <h2 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2">Add Operative</h2>
              <input className="w-full bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors" placeholder="Operative ID" value={newSoldier.username} onChange={(e) => setNewSoldier((p: any) => ({ ...p, username: e.target.value }))} />
              <input className="w-full bg-command p-2 rounded-none border border-tactical/30 font-mono text-xs focus:border-tactical outline-none transition-colors" type="password" placeholder="Passphrase" value={newSoldier.password} onChange={(e) => setNewSoldier((p: any) => ({ ...p, password: e.target.value }))} />
              <button className="w-full bg-tactical text-black rounded-none px-3 py-2 font-mono font-bold text-xs uppercase hover:bg-tactical/80 transition-colors disabled:opacity-60" disabled={busy} onClick={addSoldier}>Provision Terminal</button>
            </section>
            <section className="panel space-y-3 border-t-2 border-t-tactical">
              <h2 className="text-tactical font-mono font-bold uppercase tracking-widest text-sm border-b border-tactical/30 pb-2">Operatives Roster</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {users.length === 0 ? <p className="text-xs text-tactical/50 italic">No operatives deployed.</p> : null}
                {users.map(u => (
                  <div key={u.username} className="flex justify-between items-center bg-command/50 p-2 border border-tactical/5">
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${u.locked ? 'bg-red-500' : 'bg-tactical'}`}></span>
                      <span className="text-tactical/80 text-sm font-mono">{u.username}</span>
                    </div>
                    <button 
                      className="text-[10px] bg-red-900/20 border border-red-500/30 text-red-400 px-2 py-1 hover:bg-red-900/50"
                      onClick={() => deleteUser(u.username)}
                      disabled={busy}
                    >DELETE</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </section>
        <section className="panel space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-neon font-semibold">Encode Message (Department Transmission)</h2>
            <div className="flex bg-command border border-neon/30 rounded overflow-hidden">
              <button 
                className={`px-3 py-1 text-xs font-semibold transition-colors ${audioInputMode === "file" ? "bg-neon text-black" : "text-neon hover:bg-neon/10"}`}
                onClick={() => { setAudioInputMode("file"); handleAudioChange(null); }}
              >File</button>
              <button 
                className={`px-3 py-1 text-xs font-semibold transition-colors ${audioInputMode === "live" ? "bg-accent text-black" : "text-accent hover:bg-accent/10"}`}
                onClick={() => { setAudioInputMode("live"); handleAudioChange(null); }}
              >Live</button>
            </div>
          </div>
          {audioInputMode === "file" ? (
            <input className="w-full bg-command p-2 rounded border border-neon/30" type="file" accept=".wav,.mp3,audio/*" onChange={(e) => handleAudioChange(e.target.files?.[0] || null)} />
          ) : (
            <LiveAudioRecorder onRecordingComplete={(file) => handleAudioChange(file)} />
          )}
          <input className="w-full bg-command p-2 rounded border border-neon/30" type="file" accept=".png,.jpg,.jpeg,image/*" onChange={(e) => setCoverImage(e.target.files?.[0] || null)} />
          <select className="w-full bg-command p-2 rounded border border-neon/30" value={encodeRecipient} onChange={(e) => setEncodeRecipient(e.target.value)}>
            <option value="">Select recipient</option>
            {contacts.map((c) => (
              <option key={c.username} value={c.username}>
                {c.username} ({c.role}{c.department ? ` - ${c.department}` : ""})
              </option>
            ))}
          </select>
          <input className="w-full bg-command p-2 rounded border border-neon/30" placeholder="Optional password lock" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input className="w-full bg-command p-2 rounded border border-neon/30" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          <button className="bg-accent text-black rounded px-3 py-2 font-semibold disabled:opacity-60" disabled={busy} onClick={launchTransmission}>Launch Transmission</button>
          {launchSuccess && <p className="text-green-400 text-sm font-semibold">✓ {launchSuccess}</p>}
          {liveSpecLoading && <p className="text-accent text-xs">Generating live spectrogram...</p>}
          {liveSpecPath && (
            <div className="mt-2">
              <p className="text-xs text-neon mb-1">Live Spectrogram Preview</p>
              <AuthorizedImage
                alt="Live spectrogram preview"
                className="w-full h-auto min-h-[100px] rounded border border-neon/30"
                src={`${API}/download/stego?path=${encodeURIComponent(liveSpecPath)}`}
                token={session.token}
              />
            </div>
          )}
        </section>
        <div className="panel space-y-3">
          <h2 className="text-neon font-semibold">Decode Message</h2>
          <input className="w-full bg-command p-2 rounded border border-neon/30" type="file" accept=".png,.jpg,.jpeg,image/*" onChange={(e) => setStegoImage(e.target.files?.[0] || null)} />
          <input className="w-full bg-command p-2 rounded border border-neon/30" placeholder="Password lock (if used during encode)" value={decodePassword} onChange={(e) => setDecodePassword(e.target.value)} />
          <input className="w-full bg-command p-2 rounded border border-neon/30" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
          <button className="w-full bg-neon text-black rounded p-2 font-semibold disabled:opacity-60" disabled={busy} onClick={decryptSignal}>Decrypt Signal</button>
          
          {decodePhase >= 1 && decodeResult?.spectrogram_image && (
            <div className="mt-4 p-3 border border-neon/30 rounded bg-command/50">
              <p className="text-neon font-semibold text-sm mb-2">Analyzing Signal Spectrogram...</p>
              <AuthorizedImage
                alt="Decoded spectrogram"
                className="w-full rounded mb-3 animate-pulse"
                src={`${API}/download/stego?path=${encodeURIComponent(decodeResult.spectrogram_image)}`}
                token={session.token}
              />
              
              {decodePhase === 1 && (
                <p className="text-xs text-accent animate-pulse">Deconstructing audio from visual frequencies...</p>
              )}
              {decodePhase === 2 && decodeResult?.audio_file && (
                <div className="mt-3 pt-3 border-t border-neon/30">
                  <p className="text-green-400 text-sm font-semibold mb-2">✓ Audio Deconstruction Complete</p>
                  <AuthorizedLink
                    className="bg-accent text-black px-3 py-2 rounded font-semibold inline-block text-sm"
                    href={`${API}/download/audio?path=${encodeURIComponent(decodeResult.audio_file)}`}
                    token={session.token}
                  >
                    Download / Play Reconstructed Audio
                  </AuthorizedLink>
                  <p className="text-[10px] text-gray-400 mt-2 italic">Note: Audio file will self-destruct from server after download.</p>
                </div>
              )}
            </div>
          )}
        </div>
        <section className="panel space-y-3">
          <h2 className="text-neon font-semibold">Department Communications</h2>
          <select className="w-full bg-command p-2 rounded border border-neon/30" value={message.to_user} onChange={(e) => setMessage((p) => ({ ...p, to_user: e.target.value }))}>
            <option value="">Select recipient</option>
            {contacts.map((c) => (
              <option key={c.username} value={c.username}>
                {c.username} ({c.role}{c.department ? ` - ${c.department}` : ""})
              </option>
            ))}
          </select>
          <textarea className="w-full bg-command p-2 rounded border border-neon/30" placeholder="Message" value={message.body} onChange={(e) => setMessage((p) => ({ ...p, body: e.target.value }))} />
          <button className="bg-accent text-black rounded px-3 py-2 font-semibold mr-2 disabled:opacity-60" disabled={busy} onClick={sendMessage}>Send</button>
          <button className="bg-command border border-neon/30 rounded px-3 py-2 mr-2" onClick={fetchInbox}>Refresh Inbox</button>
          <button className="bg-command border border-neon/30 rounded px-3 py-2" onClick={fetchContacts}>Refresh Contacts</button>
          <div className="max-h-48 overflow-auto text-xs mt-2">
            {inbox.map((m, i) => (
              <div key={i} className="bg-command/70 p-2 rounded mb-1">
                <pre className="whitespace-pre-wrap">{JSON.stringify(m, null, 2)}</pre>
                {m?.type === "encoded_transmission" && m?.stego_image && (
                  <AuthorizedLink
                    className="underline text-accent text-xs block mt-1"
                    href={`${API}/download/stego?path=${encodeURIComponent(m.stego_image)}`}
                    token={session.token}
                  >
                    Download Transmission Image
                  </AuthorizedLink>
                )}
              </div>
            ))}
          </div>
        </section>
        {error && <section className="panel text-red-400 text-sm">{error}</section>}
        <section className="panel text-xs bg-command/60">
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </section>
        {showSpec && result?.spectrogram_image && (
          <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <div className="panel max-w-3xl w-full">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-neon font-semibold">Generated Spectrogram</h3>
                <button className="bg-command border border-neon/30 rounded px-2 py-1" onClick={() => setShowSpec(false)}>Close</button>
              </div>
              <AuthorizedImage
                alt="Generated spectrogram"
                className="w-full h-auto min-h-[200px] rounded border border-neon/30"
                src={`${API}/download/stego?path=${encodeURIComponent(result.spectrogram_image)}`}
                token={session.token}
              />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
