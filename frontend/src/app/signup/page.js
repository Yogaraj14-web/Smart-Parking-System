"use client";
import { useState, useRef } from 'react';

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
  
  const [profilePic, setProfilePic] = useState(''); 
  const [showPhotoMenu, setShowPhotoMenu] = useState(false); // 🔥 Menu kaaga puthu state
  
  const fileInputRef = useRef(null); 

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePic(reader.result); 
        setShowPhotoMenu(false); // Photo select aana udane menu-va close pandrom
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('Registering VIP Member...');
    setIsError(false);

    // 🔥 Default image logic: user photo select pannalana indha URL eduthukkum
    const finalProfilePic = profilePic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";

    try {
      const response = await fetch('https://smart-parking-backend-i15i.onrender.com/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, profile_pic: finalProfilePic }) 
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Registration Successful! You can now Login.');
        setIsError(false);
        setFormData({ name: '', email: '', phone_number: '', vehicle_number: '', password: '' });
        setProfilePic('');
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

      <div className="relative z-10 w-full max-w-md bg-[#1E1C1A]/90 backdrop-blur-md border border-[#2A2724] p-8 md:p-10 shadow-2xl animate-[fadeIn_0.5s_ease-out] mt-10 mb-10">
        
        <div className="text-center mb-8">
          <h2 className="text-[#C19A6B] font-semibold tracking-[0.3em] text-xs mb-2 uppercase">Grand Cinemas</h2>
          <h1 className="text-3xl font-light tracking-[0.1em] uppercase">VIP <span className="font-serif italic">Access</span></h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
          
          {/* 🔥 Profile Picture Selection Area */}
          <div className="flex flex-col items-center justify-center mb-6 relative">
            <div 
              onClick={() => setShowPhotoMenu(!showPhotoMenu)}
              className="relative w-24 h-24 rounded-full border-2 border-[#C19A6B] overflow-hidden cursor-pointer group hover:shadow-[0_0_15px_rgba(193,154,107,0.5)] transition-all"
            >
              <img 
                src={profilePic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                alt="Profile" 
                className="w-full h-full object-cover group-hover:opacity-40 transition-opacity"
              />
              <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-white text-[10px] font-bold uppercase tracking-widest">Edit</span>
              </div>
            </div>
            <p className="text-[10px] tracking-widest text-[#8B8682] uppercase mt-3">Profile Photo</p>
            
            {/* 🔥 Dropdown Menu Options */}
            {showPhotoMenu && (
              <div className="absolute top-28 z-20 bg-[#1a1917] border border-[#C19A6B]/50 shadow-xl rounded-md overflow-hidden flex flex-col w-40 animate-[fadeIn_0.2s_ease-out]">
                <button 
                  type="button"
                  onClick={() => {
                    fileInputRef.current.click();
                    setShowPhotoMenu(false);
                  }}
                  className="text-xs text-[#E8E5E1] hover:bg-[#C19A6B]/20 hover:text-[#C19A6B] py-3 px-4 text-left font-bold uppercase tracking-widest transition-colors border-b border-[#2A2724]"
                >
                  Upload Photo
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setProfilePic(''); // Profile Pic-a remove pandrom
                    setShowPhotoMenu(false);
                  }}
                  className="text-xs text-[#9E6B6B] hover:bg-[#9E6B6B]/20 hover:text-red-400 py-3 px-4 text-left font-bold uppercase tracking-widest transition-colors"
                >
                  Remove Photo
                </button>
              </div>
            )}

            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              className="hidden" 
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Full Name</label>
            <input 
              type="text" name="name" required value={formData.name} onChange={handleChange}
              className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Email</label>
            <input 
              type="email" name="email" required value={formData.email} onChange={handleChange}
              className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors"
              placeholder="john@email.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Phone</label>
              <input 
                type="tel" name="phone_number" required value={formData.phone_number} onChange={handleChange}
                className="w-full bg-[#141311] border border-[#2A2724] text-[#E8E5E1] p-3 text-sm focus:outline-none focus:border-[#C19A6B] transition-colors"
                placeholder="9876543210"
              />
            </div>
            <div>
              <label className="block text-[10px] tracking-widest text-[#8B8682] uppercase mb-2">Vehicle No.</label>
              <input 
                type="text" name="vehicle_number" required value={formData.vehicle_number} onChange={handleChange}
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