"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Login() {
  const router = useRouter();
  
  // States for form inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  
  // States for UI logic
  const [loginMethod, setLoginMethod] = useState('password'); 
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // --- Puthu Timer State ---
  const [timer, setTimer] = useState(0);

  // --- Timer Countdown Logic ---
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  // --- Normal Password Login ---
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Authenticating VIP Member...');
    setIsError(false);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Login Successful! Redirecting...');
        setIsError(false);
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => router.push('/'), 1000);
      } else {
        setMessage(data.error || 'Invalid email or password.');
        setIsError(true);
      }
    } catch (error) {
      setMessage('Server not responding.');
      setIsError(true);
    }
    setLoading(false);
  };

  // --- Request/Resend OTP API Call ---
  const handleSendOtp = async (e, isResend = false) => {
    if (e) e.preventDefault();
    if (!email) {
      setMessage('Please enter your email first.');
      setIsError(true);
      return;
    }
    
    setLoading(true);
    setMessage(isResend ? 'Resending OTP...' : 'Sending OTP to your email...');
    setIsError(false);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(isResend ? 'New OTP Sent! Please check your email.' : 'OTP Sent! Please check your email.');
        setIsError(false);
        setOtpSent(true); 
        setTimer(30); // 30 Seconds timer-a start pandrom
      } else {
        setMessage(data.error || 'Failed to send OTP.');
        setIsError(true);
      }
    } catch (error) {
      setMessage('Server not responding.');
      setIsError(true);
    }
    setLoading(false);
  };

  // --- Verify OTP API Call ---
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('Verifying VIP Access...');
    setIsError(false);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('OTP Verified! Redirecting...');
        setIsError(false);
        localStorage.setItem('user', JSON.stringify(data.user));
        setTimeout(() => router.push('/'), 1000);
      } else {
        setMessage(data.error || 'Invalid or Expired OTP.');
        setIsError(true);
      }
    } catch (error) {
      setMessage('Server not responding.');
      setIsError(true);
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen bg-[#141311] text-[#E8E5E1] font-sans selection:bg-[#C19A6B] selection:text-black flex items-center justify-center p-6">
      
      <div 
        className="absolute inset-0 z-0 opacity-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1485291571150-772bcfc10da5?q=80&w=2000&auto=format&fit=crop')" }}
      ></div>

      <div className="relative z-10 w-full max-w-md bg-[#1E1C1A]/90 backdrop-blur-md border border-[#2A2724] p-8 md:p-10 shadow-2xl animate-[fadeIn_0.5s_ease-out]">
        
        <div className="text-center mb-8">
          <h2 className="text-[#C19A6B] font-semibold tracking-[0.3em] text-xs mb-2 uppercase">Grand Cinemas</h2>
          <h1 className="text-3xl font-light tracking-[0.1em] uppercase">VIP <span className="font-serif italic">Login</span></h1>
        </div>

        {/* --- Toggle Login Method --- */}
        <div className="flex border-b border-[#2A2724] mb-8">
          <button 
            onClick={() => { setLoginMethod('password'); setMessage(''); setOtpSent(false); setTimer(0); }}
            className={`flex-1 py-3 text-[10px] tracking-widest uppercase transition-colors ${loginMethod === 'password' ? 'text-[#C19A6B] border-b-2 border-[#C19A6B]' : 'text-[#8B8682] hover:text-[#E8E5E1]'}`}
          >
            Password
          </button>
          <button 
            onClick={() => { setLoginMethod('otp'); setMessage(''); }}
            className={`flex-1 py-3 text-[10px] tracking-widest uppercase transition-colors ${loginMethod === 'otp' ? 'text-[#C19A6B] border-b-2 border-[#C19A6B]' : 'text-[#8B8682] hover:text-[#E8E5E1]'}`}
          >
            Email OTP
          </button>
        </div>

        {/* --- Form Section --- */}
        <form onSubmit={loginMethod === 'password' ? handlePasswordLogin : (otpSent ? handleVerifyOtp : handleSendOtp)} className="space-y-5" autoComplete="off">
          
          <div>
            <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Email Address</label>
            <input 
              type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              disabled={otpSent && loginMethod === 'otp'} 
              className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors disabled:opacity-50"
              placeholder="john@email.com"
            />
          </div>

          {loginMethod === 'password' && (
            <div>
              <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Password</label>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 pr-16 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors"
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8682] hover:text-[#C19A6B] text-[10px] tracking-widest font-bold uppercase transition-colors">
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>
          )}

          {loginMethod === 'otp' && otpSent && (
            <div className="animate-[fadeIn_0.3s_ease-out]">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase">Enter 6-Digit OTP</label>
                
                {/* --- The Resend OTP Button with Timer --- */}
                <button 
                  type="button" 
                  disabled={timer > 0 || loading}
                  onClick={(e) => handleSendOtp(e, true)}
                  className={`text-[10px] font-bold tracking-widest uppercase transition-colors ${timer > 0 ? 'text-[#4A4540] cursor-not-allowed' : 'text-[#C19A6B] hover:text-[#E2C096]'}`}
                >
                  {timer > 0 ? `Resend in ${timer}s` : 'Resend OTP'}
                </button>
              </div>
              
              <input 
                type="text" required value={otp} onChange={(e) => setOtp(e.target.value)}
                maxLength="6"
                className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors tracking-[0.5em] text-center"
                placeholder="------"
              />
            </div>
          )}

          {message && (
            <div className={`text-xs text-center p-2 border ${isError ? 'text-[#9E6B6B] border-[#9E6B6B]/30 bg-[#9E6B6B]/10' : 'text-[#859E7A] border-[#859E7A]/30 bg-[#859E7A]/10'}`}>
              {message}
            </div>
          )}

          <button 
            type="submit" disabled={loading}
            className="w-full py-4 mt-4 text-xs tracking-[0.2em] font-semibold uppercase transition-all duration-300 bg-[#C19A6B] text-[#141311] hover:bg-[#E2C096] hover:shadow-[0_0_15px_rgba(193,154,107,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loginMethod === 'password' ? (loading ? 'Loading...' : 'Login securely') 
             : (!otpSent ? (loading ? 'Sending...' : 'Send OTP') : (loading ? 'Verifying...' : 'Verify & Login'))}
          </button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-2">
          {loginMethod === 'otp' && otpSent && (
            <button onClick={() => { setOtpSent(false); setTimer(0); setOtp(''); }} className="text-[#8B8682] text-xs hover:text-[#C19A6B] transition-colors">
              Wrong email? Change it here
            </button>
          )}
          <p className="text-[#8B8682] text-xs mt-2">
            Don't have an account? <a href="/signup" className="text-[#C19A6B] hover:underline">Sign up here</a>
          </p>
        </div>

      </div>
    </div>
  );
}