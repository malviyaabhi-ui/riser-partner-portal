"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(e) {
    e.preventDefault();
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-2">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal to-[#3B7BF5] flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></svg>
          </div>
          <div>
            <div className="font-display font-bold text-white text-lg leading-tight">Riser</div>
            <div className="text-[10px] tracking-[2px] uppercase text-white/50">Partner Portal</div>
          </div>
        </div>
        <form onSubmit={signIn} className="card p-6 space-y-4">
          <h1 className="font-display font-bold text-lg">Sign in</h1>
          <div>
            <label className="field-label">Email</label>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="field-label">Password</label>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <p className="text-bad text-[12.5px]">{error}</p>}
          <button className="btn btn-teal w-full justify-center" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-center text-[12.5px] text-muted">
            Not a partner yet? <a href="/apply" className="text-teal-dark font-semibold">Apply here</a>
          </p>
        </form>
      </div>
    </div>
  );
}
