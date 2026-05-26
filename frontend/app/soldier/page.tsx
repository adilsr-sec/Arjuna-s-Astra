"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { API } from "../../lib/api";
import { clearSession, getSession } from "../../lib/session";
import Radar from "../../components/Radar";
import TransmissionFlow from "../../components/TransmissionFlow";
import { AuthorizedImage, AuthorizedLink } from "../../components/AuthorizedMedia";
import BurnProtocol from "../../components/BurnProtocol";
import HUDStats from "../../components/HUDStats";
import LiveAudioRecorder from "../../components/LiveAudioRecorder";
import MissionObjectives from "../../components/MissionObjectives";
import SystemIntegrity from "../../components/SystemIntegrity";

export default function SoldierDashboard() {
  const router = useRouter();
  const [session, setSession] = useState<any>(null);
  const [audioInputMode, setAudioInputMode] = useState<"file" | "live">("file");
  const [seed, setSeed] = useState(1337);
  const [audio, setAudio] = useState<File | null>(null);
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [stegoImage, setStegoImage] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [decodePassword, setDecodePassword] = useState("");
  const [message, setMessage] = useState({ to_user: "", body: "" });
  const [encodeRecipient, setEncodeRecipient] = useState("");
  const [contacts, setContacts] = useState<Array<{ username: string; role: string; department?: string | null }>>([]);
  const [inbox, setInbox] = useState<any[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showSpec, setShowSpec] = useState(false);
  const [liveSpecPath, setLiveSpecPath] = useState("");
  const [liveSpecLoading, setLiveSpecLoading] = useState(false);
  const [launchSuccess, setLaunchSuccess] = useState("");
  const [transmissionPhase, setTransmissionPhase] = useState(-1);
  const [decodePhase, setDecodePhase] = useState(-1);
  const [decodeResult, setDecodeResult] = useState<any>(null);

  useEffect(() => {
    const s = getSession();
    if (!s || s.role !== "Soldier") return router.push("/");
    setSession(s);
  }, [router]);

  const authHeader = session ? { Authorization: `Bearer ${session.token}` } : undefined;

  useEffect(() => {
    if (!session) return;
    fetchContacts();
    fetchInbox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

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
    const fd = new FormData();
    fd.append("audio", audio);
    fd.append("image", coverImage);
    fd.append("seed", String(seed));
    fd.append("to_user", encodeRecipient);
    fd.append("use_password", password ? "true" : "false");
    fd.append("password", password);
    try {
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
      setDecodePhase(1); // Phase 1: show spectrogram
      
      // Phase 2: wait a bit then show audio link
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
            <h1 className="text-2xl text-tactical font-mono tracking-widest font-bold">OPERATIVE TERMINAL</h1>
            <p className="text-[10px] text-tactical/60 font-mono tracking-widest mt-1">SECURE CONNECTION ESTABLISHED</p>
          </div>
          <button className="bg-amber text-black hover:bg-amber/80 font-bold font-mono text-xs px-4 py-2 transition-colors uppercase tracking-widest" onClick={() => { clearSession(); router.push("/"); }}>DISCONNECT</button>
        </header>

        {/* Dashboard Top Row */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MissionObjectives />
          <SystemIntegrity />
          <HUDStats />
        </section>

        {/* Radar & Comms Info */}
        <section className="grid md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-4">
            <Radar />
            <BurnProtocol session={session} />
          </div>
          <TransmissionFlow activePhase={transmissionPhase} />
        </section>
        <section className="grid lg:grid-cols-2 gap-6">
          <div className="panel space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-neon font-semibold">Encode Message</h2>
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
            <select
              className="w-full bg-command p-2 rounded border border-neon/30"
              value={encodeRecipient}
              onChange={(e) => setEncodeRecipient(e.target.value)}
            >
              <option value="">Select recipient (Department/Admin/Team)</option>
              {contacts.map((c) => (
                <option key={c.username} value={c.username}>
                  {c.username} ({c.role}{c.department ? ` - ${c.department}` : ""})
                </option>
              ))}
            </select>
            <input className="w-full bg-command p-2 rounded border border-neon/30" placeholder="Optional password lock" value={password} onChange={(e) => setPassword(e.target.value)} />
            <input className="w-full bg-command p-2 rounded border border-neon/30" type="number" value={seed} onChange={(e) => setSeed(Number(e.target.value))} />
            <button className="w-full bg-accent text-black rounded p-2 font-semibold disabled:opacity-60" disabled={busy} onClick={launchTransmission}>Launch Transmission</button>
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
          </div>
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
        </section>
        <section className="panel space-y-3">
          <h2 className="text-neon font-semibold">Secure Communications</h2>
          <input className="w-full bg-command p-2 rounded border border-neon/30" placeholder="Recipient username in your department" value={message.to_user} onChange={(e) => setMessage((p) => ({ ...p, to_user: e.target.value }))} />
          <textarea className="w-full bg-command p-2 rounded border border-neon/30" placeholder="Message" value={message.body} onChange={(e) => setMessage((p) => ({ ...p, body: e.target.value }))} />
          <button className="bg-accent text-black rounded px-3 py-2 font-semibold mr-2 disabled:opacity-60" disabled={busy} onClick={sendMessage}>Send</button>
          <button className="bg-command border border-neon/30 rounded px-3 py-2 mr-2" onClick={fetchInbox}>Refresh Inbox</button>
          <button className="bg-command border border-neon/30 rounded px-3 py-2" onClick={fetchContacts}>Refresh Contacts</button>
          <div className="max-h-40 overflow-auto text-xs mt-2">
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
