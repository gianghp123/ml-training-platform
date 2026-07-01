'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  User, 
  ArrowRight,
  ShieldCheck,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();

  // Screen States
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleValidation = () => {
    const tempErrors: { [key: string]: string } = {};
    if (isSignUp && !fullName.trim()) {
      tempErrors.fullName = 'Full name is required';
    }
    if (!email.trim()) {
      tempErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      tempErrors.email = 'Invalid email address';
    }
    if (!password) {
      tempErrors.password = 'Password is required';
    } else if (password.length < 6) {
      tempErrors.password = 'Password must be at least 6 characters';
    }
    if (isSignUp && !agreeTerms) {
      tempErrors.agreeTerms = 'You must agree to the Terms of Service';
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleValidation()) return;

    setIsLoading(true);

    // Mock network request delay
    setTimeout(() => {
      setIsLoading(false);
      router.push('/');
    }, 1800);
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setErrors({});
    setPassword('');
  };

  return (
    <main className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#060608] text-[#e5e1e4] font-sans antialiased overflow-hidden select-none">
      
      {/* LEFT COLUMN: Premium ML Pipeline Visual Board (Figma split-screen style) */}
      <section className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-[#09090c] via-[#0f111a] to-[#07080d] border-r border-[#1F1F23]/60 relative overflow-hidden">
        
        {/* Shifting radial mesh glow spots in background */}
        <div className="absolute top-1/4 left-1/4 w-[450px] h-[450px] rounded-full bg-[#3192fc]/5 blur-[120px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-[#7A5AF8]/5 blur-[100px] pointer-events-none"></div>
        
        {/* Floating Matrix Particle Overlay */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#1f1f23_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

        {/* Spacer to maintain flex layout height */}
        <div></div>

        {/* Middle Canvas: Interactive ML pipeline graph representation */}
        <div className="my-auto flex flex-col items-center justify-center z-10 w-full max-w-lg mx-auto">
          
          {/* Glassmorphic Pipeline Container card */}
          <div className="bg-[#131315]/40 border border-[#1F1F23] rounded-2xl p-6 w-full backdrop-blur-md relative shadow-2xl overflow-hidden group">
            
            {/* Animated card border reflection light */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-[#3192fc]/40 to-transparent animate-shimmer"></div>
            
            <div className="flex justify-between items-center mb-6">
              <span className="text-[10px] font-mono text-[#c0c7d5]/60 uppercase tracking-wider flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-[#32D583] mr-1.5 animate-ping"></span>
                DAG Studio: Fraud_Detection_V2
              </span>
              <span className="text-[10px] font-mono text-[#32D583] bg-[#32D583]/10 border border-[#32D583]/20 px-2 py-0.5 rounded-full font-bold">
                94.2% ACCURACY
              </span>
            </div>

            {/* Interactive Neon SVG Workflow Diagram */}
            <svg viewBox="0 0 320 120" className="w-full h-auto overflow-visible mb-6">
              
              {/* Connection Paths with marching ants stroke animation */}
              <path d="M 40 60 H 110" stroke="#1F1F23" strokeWidth="2" strokeDasharray="3,3" />
              <path d="M 120 60 H 190" stroke="#1F1F23" strokeWidth="2" strokeDasharray="3,3" />
              <path d="M 200 60 H 270" stroke="#1F1F23" strokeWidth="2" strokeDasharray="3,3" />

              {/* Glowing active execution path overlay */}
              <path 
                d="M 40 60 H 200" 
                stroke="url(#neon-grad)" 
                strokeWidth="2.5" 
                strokeDasharray="5,15" 
                strokeDashoffset="0"
                className="animate-dash"
                style={{ strokeDasharray: '6', strokeDashoffset: '40' }}
              />

              {/* Gradient Definitions */}
              <defs>
                <linearGradient id="neon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#3192fc" />
                  <stop offset="100%" stopColor="#7A5AF8" />
                </linearGradient>
                <filter id="neon-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              {/* Node 1: Ingestion */}
              <g transform="translate(40, 60)" className="cursor-pointer">
                <circle r="14" fill="#131315" stroke="#3192fc" strokeWidth="2" filter="url(#neon-glow)" />
                <text y="3" fill="#e5e1e4" fontSize="8" fontFamily="monospace" textAnchor="middle">IN</text>
                <text y="26" fill="#c0c7d5" fontSize="7" textAnchor="middle" opacity="0.6">Ingest</text>
              </g>

              {/* Node 2: Transform */}
              <g transform="translate(120, 60)" className="cursor-pointer">
                <circle r="14" fill="#131315" stroke="#7A5AF8" strokeWidth="2" />
                <text y="3" fill="#e5e1e4" fontSize="8" fontFamily="monospace" textAnchor="middle">TR</text>
                <text y="26" fill="#c0c7d5" fontSize="7" textAnchor="middle" opacity="0.6">Scale</text>
              </g>

              {/* Node 3: Train (Glowing Active State) */}
              <g transform="translate(200, 60)" className="cursor-pointer">
                <circle r="14" fill="#131315" stroke="#7A5AF8" strokeWidth="2" filter="url(#neon-glow)" className="animate-pulse" />
                <circle r="17" fill="none" stroke="#7A5AF8" strokeWidth="1" strokeDasharray="3" className="animate-spin" style={{ transformOrigin: '200px 60px', animationDuration: '6s' }} />
                <text y="3" fill="#e5e1e4" fontSize="8" fontFamily="monospace" textAnchor="middle">FIT</text>
                <text y="26" fill="#7A5AF8" fontSize="7" textAnchor="middle" fontWeight="bold">Training</text>
              </g>

              {/* Node 4: Eval */}
              <g transform="translate(280, 60)" className="cursor-pointer">
                <circle r="14" fill="#131315" stroke="#1F1F23" strokeWidth="2" />
                <text y="3" fill="#c0c7d5" fontSize="8" fontFamily="monospace" textAnchor="middle" opacity="0.5">EV</text>
                <text y="26" fill="#c0c7d5" fontSize="7" textAnchor="middle" opacity="0.4">Evaluate</text>
              </g>
            </svg>

            {/* Simulated Training Status Metrics Log block */}
            <div className="bg-[#050507] border border-[#1F1F23]/80 rounded-xl p-3 font-mono text-[9px] text-[#32D583] space-y-1">
              <div className="flex justify-between text-[#c0c7d5]/40 text-[8px]">
                <span>ORCHESTRATOR TRACE</span>
                <span>STEP 3 OF 4</span>
              </div>
              <div className="flex items-center text-[#3192fc]">
                <span className="w-1 h-1 rounded-full bg-[#3192fc] mr-1.5"></span>
                [epoch 34/50] Loss: 0.1425 | Val Loss: 0.1682
              </div>
              <div className="flex items-center text-[#7A5AF8]">
                <span className="w-1 h-1 rounded-full bg-[#7A5AF8] mr-1.5 animate-ping"></span>
                Fitting layers: NeuralWeightsConnector (38.2M parameters)...
              </div>
            </div>
          </div>

          <div className="mt-8 text-center space-y-2">
            <h2 className="text-lg font-bold text-white tracking-tight flex items-center justify-center space-x-1.5">
              <span>Accelerate ML Pipelines</span>
              <Sparkles className="w-4 h-4 text-[#FDB022] animate-pulse" />
            </h2>
            <p className="text-xs text-[#c0c7d5] opacity-75 max-w-sm">
              Design, test, and register production-grade neural networks directly through our interactive visual canvas environment.
            </p>
          </div>
        </div>

        {/* Bottom Footer Info */}
        <div className="flex justify-between items-center text-[10px] text-[#c0c7d5]/40 font-mono z-10">
          <span>&copy; {new Date().getFullYear()} Antigravity Inc.</span>
          <div className="flex space-x-4">
            <a href="#" className="hover:text-[#c0c7d5] transition-colors">Documentation</a>
            <a href="#" className="hover:text-[#c0c7d5] transition-colors">Privacy Policy</a>
          </div>
        </div>
      </section>

      {/* RIGHT COLUMN: Interactive Login / Sign Up Form Screen */}
      <section className="flex flex-col justify-center px-6 sm:px-12 md:px-20 lg:px-16 xl:px-24 py-12 relative">
        
        {/* Glow behind form card */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] rounded-full bg-[#7A5AF8]/5 blur-[90px] pointer-events-none"></div>

        <div className="w-full max-w-md mx-auto space-y-6 z-10">


          {/* Form Title & Toggle Switch */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">
              {isSignUp ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="text-xs text-[#c0c7d5]/70">
              {isSignUp 
                ? 'Register now to scaffold your machine learning pipelines.' 
                : 'Enter your credentials to access the orchestrator workspace.'
              }
            </p>
          </div>

          {/* Social Sign-In buttons (Figma template layout) */}
          <div className="grid grid-cols-3 gap-3">
            
            {/* Google */}
            <button 
              type="button"
              onClick={() => alert('Signing in with Google...')}
              className="bg-[#131315] hover:bg-[#353437]/40 border border-[#1F1F23] rounded-xl py-2 flex items-center justify-center hover:border-[#404753] transition-colors cursor-pointer group"
              title="Google"
            >
              <svg className="w-4 h-4 group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
            </button>

            {/* Github */}
            <button 
              type="button"
              onClick={() => alert('Signing in with GitHub...')}
              className="bg-[#131315] hover:bg-[#353437]/40 border border-[#1F1F23] rounded-xl py-2 flex items-center justify-center hover:border-[#404753] transition-colors cursor-pointer group"
              title="GitHub"
            >
              <svg className="w-4 h-4 text-[#e5e1e4] group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
              </svg>
            </button>

            {/* Facebook */}
            <button 
              type="button"
              onClick={() => alert('Signing in with Facebook...')}
              className="bg-[#131315] hover:bg-[#353437]/40 border border-[#1F1F23] rounded-xl py-2 flex items-center justify-center hover:border-[#404753] transition-colors cursor-pointer group"
              title="Facebook"
            >
              <svg className="w-4 h-4 text-[#1877F2] group-hover:scale-105 transition-transform" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center justify-between text-[#c0c7d5]/20 text-[10px] font-semibold uppercase tracking-wider">
            <span className="w-1/3 h-[1px] bg-current"></span>
            <span className="mx-2 text-center text-[#c0c7d5]/40 shrink-0">Or continue with</span>
            <span className="w-1/3 h-[1px] bg-current"></span>
          </div>

          {/* Main Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Full Name Field (Sign Up Mode Only) */}
            {isSignUp && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#c0c7d5]/60 uppercase tracking-widest block font-bold">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#c0c7d5]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your name"
                    className={`w-full bg-[#131315]/50 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e5e1e4] placeholder:text-[#c0c7d5]/30 focus:outline-none focus:ring-2 focus:ring-[#3192fc]/20 transition-all ${
                      errors.fullName ? 'border-[#F04438] focus:border-[#F04438]' : 'border-[#1F1F23] focus:border-[#3192fc]'
                    }`}
                  />
                </div>
                {errors.fullName && (
                  <span className="text-[9px] text-[#F04438] font-semibold block">{errors.fullName}</span>
                )}
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-[10px] font-mono text-[#c0c7d5]/60 uppercase tracking-widest block font-bold">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#c0c7d5]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className={`w-full bg-[#131315]/50 border rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#e5e1e4] placeholder:text-[#c0c7d5]/30 focus:outline-none focus:ring-2 focus:ring-[#3192fc]/20 transition-all ${
                    errors.email ? 'border-[#F04438] focus:border-[#F04438]' : 'border-[#1F1F23] focus:border-[#3192fc]'
                  }`}
                />
              </div>
              {errors.email && (
                <span className="text-[9px] text-[#F04438] font-semibold block">{errors.email}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-mono text-[#c0c7d5]/60 uppercase tracking-widest block font-bold">
                  Password
                </label>
                {!isSignUp && (
                  <a href="#" className="text-[10px] text-[#3192fc] hover:underline font-semibold font-sans">
                    Forgot password?
                  </a>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#c0c7d5]/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 6 characters"
                  className={`w-full bg-[#131315]/50 border rounded-xl pl-10 pr-10 py-2.5 text-xs text-[#e5e1e4] placeholder:text-[#c0c7d5]/30 focus:outline-none focus:ring-2 focus:ring-[#3192fc]/20 transition-all ${
                    errors.password ? 'border-[#F04438] focus:border-[#F04438]' : 'border-[#1F1F23] focus:border-[#3192fc]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#c0c7d5]/40 hover:text-white transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <span className="text-[9px] text-[#F04438] font-semibold block">{errors.password}</span>
              )}
            </div>

            {/* Remember Me Checkbox / Terms of Service Agreement */}
            {isSignUp ? (
              <div className="space-y-1.5 pt-1">
                <label className="flex items-start space-x-2 text-[11px] text-[#c0c7d5] cursor-pointer">
                  <div className="relative flex items-center mt-0.5">
                    <input
                      type="checkbox"
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                      agreeTerms 
                        ? 'bg-[#3192fc] border-[#3192fc] text-white' 
                        : 'bg-[#131315] border-[#1F1F23]'
                    }`}>
                      {agreeTerms && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>
                  <span className="leading-tight opacity-75">
                    I agree to the <a href="#" className="text-[#3192fc] hover:underline">Terms of Service</a> and <a href="#" className="text-[#3192fc] hover:underline">Privacy Policy</a>
                  </span>
                </label>
                {errors.agreeTerms && (
                  <span className="text-[9px] text-[#F04438] font-semibold block">{errors.agreeTerms}</span>
                )}
              </div>
            ) : (
              <label className="flex items-center space-x-2 text-[11px] text-[#c0c7d5] cursor-pointer pt-1">
                <div className="relative flex items-center">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${
                    rememberMe 
                      ? 'bg-[#3192fc] border-[#3192fc] text-white' 
                      : 'bg-[#131315] border-[#1F1F23]'
                  }`}>
                    {rememberMe && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                </div>
                <span className="leading-none opacity-75 select-none">Remember this device</span>
              </label>
            )}

            {/* Main Submit Action */}
            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-[#3192fc] to-[#7A5AF8] hover:brightness-110 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 active:scale-98 transition-all w-full text-xs flex items-center justify-center space-x-2 cursor-pointer mt-6 h-10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Configuring workspace...</span>
                </>
              ) : (
                <>
                  <span>{isSignUp ? 'Scaffold New Workspace' : 'Initialize Session'}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer toggle mode */}
          <div className="text-center pt-2">
            <p className="text-xs text-[#c0c7d5]/60">
              {isSignUp ? 'Already registered?' : 'First time running pipelines?'}
              <button
                type="button"
                onClick={toggleMode}
                className="text-[#3192fc] hover:underline font-bold ml-1 cursor-pointer bg-transparent border-none outline-none"
              >
                {isSignUp ? 'Sign in to workspace' : 'Create an account'}
              </button>
            </p>
          </div>

        </div>
      </section>
    </main>
  );
}
