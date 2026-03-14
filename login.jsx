// src/pages/Login.jsx — Dual Theme: Light (new user) / Dark (returning dark-mode user)
import { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mail, Lock, LogIn, ArrowRight, ArrowLeft,
  CheckCircle, AlertCircle, Eye, EyeOff, Chrome, Loader2
} from "lucide-react";

/* ── Detect if user previously chose dark mode ── */
const getUserTheme = () => {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark') return 'dark';
    if (stored === 'light') return 'light';
    // Check ThemeContext pattern
    const isDark = localStorage.getItem('isDark');
    if (isDark === 'true') return 'dark';
  } catch {}
  return 'light'; // default: light for new/guest users
};

const HERO_IMAGES = [
  { url: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1400&auto=format&fit=crop&q=80", label: "Professional Home Services" },
  { url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1400&auto=format&fit=crop&q=80", label: "24/7 Emergency Repairs" },
  { url: "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1400&auto=format&fit=crop&q=80", label: "Certified Professionals" },
  { url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=1400&auto=format&fit=crop&q=80", label: "Satisfaction Guaranteed" },
];

export default function Login() {
  const [theme] = useState(getUserTheme);
  const isDark = theme === 'dark';

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [heroIdx, setHeroIdx] = useState(0);
  const navigate = useNavigate();
  const particlesRef = useRef([]);

  /* Hero cycle */
  useEffect(() => {
    const id = setInterval(() => setHeroIdx(i => (i + 1) % HERO_IMAGES.length), 5000);
    return () => clearInterval(id);
  }, []);

  /* ── LOGIN ── */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError(""); setSuccess(""); setLoading(true);

    ['companyId','token','userRole','userData','user'].forEach(k => localStorage.removeItem(k));

    const endpoints = [
      { url: "http://localhost:5001/admin/login",      role: "admin" },
      { url: "http://localhost:5001/company/login",    role: "company" },
      { url: "http://localhost:5001/technician/login", role: "technician" },
      { url: "http://localhost:5001/auth/login",       role: "user" },
    ];

    let userData = null, token = null, role = null, successfulEndpoint = null, blockedMessage = null;

    for (let ep of endpoints) {
      try {
        const res = await fetch(ep.url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
        const data = await res.json();

        if (res.status === 403) { blockedMessage = data.error || data.message || "Account not authorized"; break; }
        if (res.status === 401 || !res.ok) continue;

        if (ep.role === "admin") { token = data.token || data.data?.token; userData = data.admin || data.data?.admin || data.user; role = userData?.role || "ADMIN"; }
        else if (ep.role === "company") {
          token = data.token; userData = data.user; role = "COMPANY_ADMIN";
          const cId = userData?.companyId || userData?.id;
          if (cId) localStorage.setItem('companyId', cId);
        }
        else if (ep.role === "technician") {
          token = data.token || data.data?.token; userData = data.technician || data.data?.technician || data.user; role = userData?.role || "TECHNICIAN";
          const st = userData?.status?.toUpperCase();
          if (st === "PENDING" || st === "INVITED") {
            localStorage.setItem("pendingTechnician", "true"); localStorage.setItem("technicianStatus", st);
            if (token) localStorage.setItem("pendingToken", token);
            localStorage.setItem("pendingUserData", JSON.stringify(userData));
            navigate("/technician/application-status"); setLoading(false); return;
          } else if (st === "REJECTED") { setError("Your application has been rejected. Please contact the company."); localStorage.clear(); setLoading(false); return; }
        }
        else if (ep.role === "user") {
          token = data.token || data.data?.token; userData = data.user || data.data?.user; role = userData?.role || "CUSTOMER";
          if (role === "COMPANY_ADMIN") { token = null; userData = null; role = null; continue; }
        }

        successfulEndpoint = ep.role; break;
      } catch { continue; }
    }

    if (blockedMessage) { setError(blockedMessage); setLoading(false); return; }
    if (!successfulEndpoint || !token) { setError("Invalid email or password"); setLoading(false); return; }

    localStorage.setItem("token", token);
    if (role) localStorage.setItem("userRole", role);
    if (userData) localStorage.setItem("userData", JSON.stringify(userData));
    if (userData) {
      const isCA = role === 'COMPANY_ADMIN';
      const cId = isCA ? (userData.companyId || userData.id || null) : null;
      localStorage.setItem("user", JSON.stringify({ id: isCA ? cId : (userData.id || userData.userId || null), name: userData.name || userData.email || 'User', email: userData.email || null, role: role || userData.role || null, companyId: cId }));
    }

    setSuccess("Login successful! Redirecting...");
    setTimeout(() => {
      switch (role) {
        case "SUPER_ADMIN": case "ADMIN": navigate("/admin/adminhome"); break;
        case "COMPANY_ADMIN": navigate("/company/companyhome"); break;
        case "TECHNICIAN": navigate("/technician/technicianhome"); break;
        default: navigate("/home");
      }
    }, 1400);
    setLoading(false);
  };

  /* ── FORGOT PASSWORD ── */
  const handleForgot = async (e) => {
    e.preventDefault();
    if (!resetEmail) { setError("Please enter your email address"); return; }
    setResetLoading(true); setError("");
    try {
      const res = await fetch("http://localhost:5001/auth/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: resetEmail }) });
      const data = await res.json();
      if (res.ok) { setResetSent(true); setTimeout(() => setSuccess(""), 5000); }
      else setError(data.error || "Failed to send reset email.");
    } catch { setError("Network error. Please try again."); }
    finally { setResetLoading(false); }
  };

  const toggleForgot = () => { setShowForgot(p => !p); setError(""); setSuccess(""); setResetSent(false); setResetEmail(""); };

  /* ── THEME TOKENS ── */
  const T = isDark ? {
    page: 'bg-[#080808]',
    panel: 'bg-[#0e0e0e]',
    panelBorder: 'border-white/[0.06]',
    heading: 'text-white',
    sub: 'text-white/40',
    label: 'text-white/50',
    inputBg: 'bg-white/[0.04] border-white/[0.1] text-white placeholder-white/20',
    inputFocus: 'focus:border-blue-500/60 focus:bg-white/[0.06]',
    iconColor: 'text-white/25',
    divider: 'border-white/[0.06]',
    dividerText: 'bg-[#0e0e0e] text-white/25',
    link: 'text-blue-400 hover:text-blue-300',
    guestLink: 'text-white/25 hover:text-white/60',
    remember: 'text-white/40',
    scrollbar: '::-webkit-scrollbar{width:5px;background:#080808} ::-webkit-scrollbar-thumb{background:#3b82f6;border-radius:3px}',
    accent: '#3b82f6',
    btnBg: 'bg-blue-600 hover:bg-blue-500',
    btnShadow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]',
    googleBtn: 'border-white/[0.08] hover:bg-white/[0.04] text-white/60',
    errorBg: 'bg-red-500/10 border-red-500/20 text-red-400',
    successBg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  } : {
    page: 'bg-[#f8f8f6]',
    panel: 'bg-white',
    panelBorder: 'border-gray-100',
    heading: 'text-gray-900',
    sub: 'text-gray-400',
    label: 'text-gray-600',
    inputBg: 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-300',
    inputFocus: 'focus:border-blue-500 focus:bg-white',
    iconColor: 'text-gray-400',
    divider: 'border-gray-100',
    dividerText: 'bg-white text-gray-400',
    link: 'text-blue-600 hover:text-blue-800',
    guestLink: 'text-gray-400 hover:text-blue-600',
    remember: 'text-gray-500',
    scrollbar: '::-webkit-scrollbar{width:5px;background:#f8f8f6} ::-webkit-scrollbar-thumb{background:#3b82f6;border-radius:3px}',
    accent: '#2563eb',
    btnBg: 'bg-blue-600 hover:bg-blue-700',
    btnShadow: 'shadow-blue-500/20 shadow-lg',
    googleBtn: 'border-gray-200 hover:bg-gray-50 text-gray-700',
    errorBg: 'bg-red-50 border-red-200 text-red-600',
    successBg: 'bg-green-50 border-green-200 text-green-600',
  };

  const fieldCls = `w-full pl-11 pr-4 py-3.5 border rounded-xl text-sm outline-none transition-all ${T.inputBg} ${T.inputFocus}`;

  return (
    <div className={`min-h-screen flex ${T.page} overflow-hidden`} style={{ fontFamily: "'Syne','Outfit',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=Outfit:wght@300;400;500;600&display=swap');
        * { -webkit-font-smoothing: antialiased; }
        ::selection { background: ${T.accent}; color: #fff; }
        ${T.scrollbar}
      `}</style>

      {/* ═══ LEFT — Cinematic image panel ═══ */}
      <div className="hidden lg:block lg:w-[58%] relative overflow-hidden">
        <AnimatePresence mode="wait">
          {HERO_IMAGES.map((img, i) => i === heroIdx ? (
            <motion.div key={img.url} className="absolute inset-0"
              initial={{ opacity: 0, scale: 1.07 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}>
              <img src={img.url} alt="" className="w-full h-full object-cover" />
            </motion.div>
          ) : null)}
        </AnimatePresence>

        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20 z-10" />
        {isDark && <div className="absolute inset-0 bg-[#080808]/30 z-10" />}

        {/* Left panel content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-between p-14">
          {/* Logo */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <span className="text-3xl font-black text-white tracking-tight">Homez</span>
          </motion.div>

          {/* Main copy */}
          <div>
            <AnimatePresence mode="wait">
              <motion.p key={`label-${heroIdx}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-[11px] font-semibold tracking-[0.3em] uppercase text-white/40 mb-4"
                style={{ fontFamily: "'Outfit',sans-serif" }}>
                {HERO_IMAGES[heroIdx].label}
              </motion.p>
            </AnimatePresence>

            <motion.h2 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.8rem,5vw,4.5rem)] font-black text-white leading-[1.05] tracking-tight mb-8">
              Your home,<br /><span style={{ color: T.accent }}>perfectly</span><br />maintained.
            </motion.h2>

            {/* Stats row */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="flex gap-8 mb-10">
              {[{ n: '15k+', l: 'Customers' }, { n: '500+', l: 'Technicians' }, { n: '4.8★', l: 'Avg Rating' }].map(s => (
                <div key={s.n}>
                  <div className="text-2xl font-black text-white">{s.n}</div>
                  <div className="text-[11px] text-white/40 tracking-widest uppercase" style={{ fontFamily: "'Outfit',sans-serif" }}>{s.l}</div>
                </div>
              ))}
            </motion.div>

            {/* Slide dots */}
            <div className="flex gap-2">
              {HERO_IMAGES.map((_, i) => (
                <motion.button key={i} onClick={() => setHeroIdx(i)}
                  animate={{ width: i === heroIdx ? 28 : 6, height: 6, background: i === heroIdx ? '#fff' : 'rgba(255,255,255,0.25)' }}
                  transition={{ duration: 0.4 }} className="rounded-full" />
              ))}
            </div>
          </div>

          {/* Bottom left watermark */}
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
            className="text-[11px] text-white/20 tracking-widest uppercase" style={{ fontFamily: "'Outfit',sans-serif" }}>
            Malaysia's #1 Home Service Platform
          </motion.p>
        </div>
      </div>

      {/* ═══ RIGHT — Form panel ═══ */}
      <div className={`w-full lg:w-[42%] flex items-center justify-center px-8 py-12 overflow-y-auto border-l ${T.panelBorder} ${T.panel}`}>
        <motion.div className="w-full max-w-[380px]"
          initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <h1 className={`text-3xl font-black ${T.heading}`}>Homez</h1>
            <p className={`text-sm mt-1 ${T.sub}`} style={{ fontFamily: "'Outfit',sans-serif" }}>Your trusted home service platform</p>
          </div>

          <AnimatePresence mode="wait">
            {!showForgot ? (
              /* ── LOGIN FORM ── */
              <motion.div key="login" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                <div className="mb-8">
                  <h2 className={`text-[clamp(1.6rem,3vw,2rem)] font-black leading-tight tracking-tight mb-1 ${T.heading}`}>Welcome back.</h2>
                  <p className={`text-sm ${T.sub}`} style={{ fontFamily: "'Outfit',sans-serif" }}>Log in to your Homez account</p>
                </div>

                {/* Error / Success */}
                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${T.errorBg}`}
                      style={{ fontFamily: "'Outfit',sans-serif" }}>
                      <AlertCircle size={16} className="shrink-0" />{error}
                    </motion.div>
                  )}
                  {success && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${T.successBg}`}
                      style={{ fontFamily: "'Outfit',sans-serif" }}>
                      <CheckCircle size={16} className="shrink-0" />{success}
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleLogin} className="space-y-4">
                  {/* Email */}
                  <div>
                    <label className={`block text-[11px] font-semibold uppercase tracking-[0.18em] mb-1.5 ${T.label}`} style={{ fontFamily: "'Outfit',sans-serif" }}>Email Address</label>
                    <div className="relative">
                      <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${T.iconColor}`} />
                      <input type="email" value={email} onChange={e => setEmail(e.target.value)} className={fieldCls} placeholder="you@email.com" required disabled={loading} />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className={`block text-[11px] font-semibold uppercase tracking-[0.18em] mb-1.5 ${T.label}`} style={{ fontFamily: "'Outfit',sans-serif" }}>Password</label>
                    <div className="relative">
                      <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${T.iconColor}`} />
                      <input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)}
                        className={`${fieldCls} pr-11`} placeholder="••••••••" required disabled={loading} />
                      <button type="button" onClick={() => setShowPassword(p => !p)}
                        className={`absolute right-3.5 top-1/2 -translate-y-1/2 ${T.iconColor} hover:opacity-80 transition-opacity`}>
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Remember / Forgot */}
                  <div className="flex items-center justify-between pt-0.5">
                    <label className={`flex items-center gap-2 text-[12px] cursor-pointer ${T.remember}`} style={{ fontFamily: "'Outfit',sans-serif" }}>
                      <input type="checkbox" className="w-3.5 h-3.5 rounded" /> Remember me
                    </label>
                    <button type="button" onClick={toggleForgot} className={`text-[12px] font-semibold transition-colors ${T.link}`} style={{ fontFamily: "'Outfit',sans-serif" }}>Forgot password?</button>
                  </div>

                  {/* Submit */}
                  <motion.button type="submit" disabled={loading} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                    className={`w-full py-3.5 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all mt-2 ${T.btnBg} ${T.btnShadow} disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{ fontFamily: "'Outfit',sans-serif" }}>
                    {loading ? <><Loader2 className="w-4 h-4 animate-spin" />Logging in...</> : <><LogIn className="w-4 h-4" />Log In</>}
                  </motion.button>
                </form>

                {/* Divider */}
                <div className="relative my-6">
                  <div className={`absolute inset-0 flex items-center`}><div className={`w-full border-t ${T.divider}`} /></div>
                  <div className="relative flex justify-center">
                    <span className={`px-3 text-[11px] tracking-widest uppercase ${T.dividerText}`} style={{ fontFamily: "'Outfit',sans-serif" }}>or continue with</span>
                  </div>
                </div>

                {/* Google */}
                <motion.a href="http://localhost:5001/auth/google" whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                  className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl border text-sm font-medium transition-all ${T.googleBtn}`}
                  style={{ fontFamily: "'Outfit',sans-serif" }}>
                  <Chrome className="w-4 h-4 text-red-400" /> Continue with Google
                </motion.a>

                {/* Register link */}
                <p className={`text-center mt-6 text-sm ${T.sub}`} style={{ fontFamily: "'Outfit',sans-serif" }}>
                  Don't have an account?{' '}
                  <Link to="/register" className={`font-bold transition-colors inline-flex items-center gap-1 group ${T.link}`}>
                    Sign up <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </p>
              </motion.div>
            ) : (
              /* ── FORGOT PASSWORD ── */
              <motion.div key="forgot" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.3 }}>
                <button onClick={toggleForgot} className={`flex items-center gap-1.5 text-sm mb-7 transition-colors ${T.sub} hover:${T.heading}`} style={{ fontFamily: "'Outfit',sans-serif" }}>
                  <ArrowLeft className="w-4 h-4" /> Back to login
                </button>
                <div className="mb-8">
                  <h2 className={`text-[clamp(1.6rem,3vw,2rem)] font-black leading-tight tracking-tight mb-1 ${T.heading}`}>Reset password.</h2>
                  <p className={`text-sm ${T.sub}`} style={{ fontFamily: "'Outfit',sans-serif" }}>We'll send a reset link to your email.</p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${T.errorBg}`}
                      style={{ fontFamily: "'Outfit',sans-serif" }}>
                      <AlertCircle size={16} />{error}
                    </motion.div>
                  )}
                  {resetSent && (
                    <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className={`mb-5 px-4 py-3 rounded-xl text-sm border flex items-center gap-2 ${T.successBg}`}
                      style={{ fontFamily: "'Outfit',sans-serif" }}>
                      <CheckCircle size={16} /> Reset link sent — check your email.
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleForgot} className="space-y-4">
                  <div>
                    <label className={`block text-[11px] font-semibold uppercase tracking-[0.18em] mb-1.5 ${T.label}`} style={{ fontFamily: "'Outfit',sans-serif" }}>Email Address</label>
                    <div className="relative">
                      <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${T.iconColor}`} />
                      <input type="email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} className={fieldCls} placeholder="you@email.com" required disabled={resetLoading || resetSent} />
                    </div>
                  </div>
                  <motion.button type="submit" disabled={resetLoading || resetSent} whileHover={{ scale: 1.015 }} whileTap={{ scale: 0.985 }}
                    className={`w-full py-3.5 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all ${T.btnBg} ${T.btnShadow} disabled:opacity-50 disabled:cursor-not-allowed`}
                    style={{ fontFamily: "'Outfit',sans-serif" }}>
                    {resetLoading ? <><Loader2 className="w-4 h-4 animate-spin" />Sending...</> : resetSent ? <><CheckCircle className="w-4 h-4" />Sent!</> : <><Mail className="w-4 h-4" />Send Reset Link</>}
                  </motion.button>
                </form>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Guest link */}
          <div className={`text-center mt-8 pt-6 border-t ${T.divider}`}>
            <Link to="/guest" className={`text-xs transition-colors inline-flex items-center gap-1 group ${T.guestLink}`} style={{ fontFamily: "'Outfit',sans-serif" }}>
              <ArrowLeft className="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> Browse services as guest
            </Link>
          </div>

          {/* Theme indicator */}
          {isDark && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
              className="text-center mt-4 text-[10px] text-white/15 tracking-widest uppercase"
              style={{ fontFamily: "'Outfit',sans-serif" }}>
              Dark mode active
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}