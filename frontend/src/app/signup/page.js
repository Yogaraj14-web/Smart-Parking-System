"use client";
import { useState } from 'react';

export default function SignUp() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone_number: '',
    vehicle_number: '',
    password: ''
  });
  
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Registering VIP Member...');
    setIsError(false);

    try {
      const response = await fetch('http://127.0.0.1:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Registration Successful! You can now Login.');
        setIsError(false);
        setFormData({ name: '', email: '', phone_number: '', vehicle_number: '', password: '' });
      } else {
        setMessage(data.error || 'Already registered! Please login.');
        setIsError(true);
      }
    } catch (error) {
      setMessage('Server not responding. Is the backend running?');
      setIsError(true);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#141311] text-[#E8E5E1] font-sans selection:bg-[#C19A6B] selection:text-black flex items-center justify-center p-6">
      
      <div 
        className="absolute inset-0 z-0 opacity-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1485291571150-772bcfc10da5?q=80&w=2000&auto=format&fit=crop')" }}
      ></div>

      <div className="relative z-10 w-full max-w-md bg-[#1E1C1A]/90 backdrop-blur-md border border-[#2A2724] p-8 md:p-10 shadow-2xl animate-[fadeIn_0.5s_ease-out]">
        
        <div className="text-center mb-10">
          <h2 className="text-[#C19A6B] font-semibold tracking-[0.3em] text-xs mb-2 uppercase">Grand Cinemas</h2>
          <h1 className="text-3xl font-light tracking-[0.1em] uppercase">VIP <span className="font-serif italic">Access</span></h1>
        </div>

        {/* Added autoComplete="off" to the form */}
        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          <div>
            <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Full Name</label>
            <input 
              type="text" name="name" required value={formData.name} onChange={handleChange}
              autoComplete="off"
              className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Email</label>
            <input 
              type="email" name="email" required value={formData.email} onChange={handleChange}
              autoComplete="off"
              className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors"
              placeholder="john@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Phone</label>
              <input 
                type="tel" name="phone_number" required value={formData.phone_number} onChange={handleChange}
                autoComplete="off"
                className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Vehicle No.</label>
              <input 
                type="text" name="vehicle_number" required value={formData.vehicle_number} onChange={handleChange}
                autoComplete="off"
                className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors uppercase"
                placeholder="TN 01 AB 1234"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                name="password" required value={formData.password} onChange={handleChange}
                autoComplete="new-password" /* This stops browser from suggesting saved passwords */
                className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 pr-16 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors"
                placeholder="••••••••"
              />
              <button 
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8B8682] hover:text-[#C19A6B] text-[10px] tracking-widest font-bold uppercase transition-colors"
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          {message && (
            <div className={`text-xs text-center p-2 border ${isError ? 'text-[#9E6B6B] border-[#9E6B6B]/30 bg-[#9E6B6B]/10' : 'text-[#859E7A] border-[#859E7A]/30 bg-[#859E7A]/10'}`}>
              {message}
            </div>
          )}

          <button 
            type="submit"
            className="w-full py-4 mt-4 text-xs tracking-[0.2em] font-semibold uppercase transition-all duration-300 bg-[#C19A6B] text-[#141311] hover:bg-[#E2C096] hover:shadow-[0_0_15px_rgba(193,154,107,0.3)]"
          >
            Create Account
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[#8B8682] text-xs">
            Already have an account? <a href="/login" className="text-[#C19A6B] hover:underline">Login here</a>
          </p>
        </div>

      </div>
    </div>
  );
}