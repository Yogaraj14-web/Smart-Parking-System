"use client";
import { useState, useEffect, useRef } from 'react'; 
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client'; 

export default function Home() {
  const router = useRouter();
  
  const [slots, setSlots] = useState([]);
  const [user, setUser] = useState(null);
  const [myActiveBookings, setMyActiveBookings] = useState([]);

  const [showPayment, setShowPayment] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentType, setPaymentType] = useState('book'); 
  
  const [isUpdatingPic, setIsUpdatingPic] = useState(false); 
  const [showPhotoMenu, setShowPhotoMenu] = useState(false); // 🔥 Dropdown Menu State
  const fileInputRef = useRef(null); 

  const loadData = async () => {
    try {
      const res = await fetch('https://smart-parking-backend-i15i.onrender.com/api/slots');
      if (!res.ok) return; 
      const data = await res.json();
      if (data.status === "success") {
        setSlots(data.data || []); 
      }
    } catch (error) {
      console.error("Error fetching slots (Server might be down):", error);
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      try {
        const res = await fetch(`https://smart-parking-backend-i15i.onrender.com/api/my-bookings/${parsedUser.user_id}`);
        if (!res.ok) return;

        const data = await res.json();
        if (data.status === "success") {
          const active = data.data.filter(b => b.booking_status === 'Active' || b.booking_status === 'Parked');
          setMyActiveBookings(active);
        }
      } catch (error) {
        console.error("Backend connection failed:", error);
      }
    }
  };

  useEffect(() => {
    loadData();
    
    const socket = io('https://smart-parking-backend-i15i.onrender.com', {
      transports: ['websocket', 'polling']
    });
    
    socket.on('live_update', (data) => {
      loadData(); 
    });

    const handleRefresh = () => loadData();
    window.addEventListener('refresh_parking_data', handleRefresh);
    
    return () => {
      socket.disconnect();
      window.removeEventListener('refresh_parking_data', handleRefresh);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  // 🔥 Upload Profile Pic
  const handleProfilePicUpdate = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setIsUpdatingPic(true);
      setShowPhotoMenu(false); // Close menu

      try {
        const res = await fetch('https://smart-parking-backend-i15i.onrender.com/api/update-profile-pic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.user_id, profile_pic: base64String })
        });

        const data = await res.json();
        if (res.ok) {
          const updatedUser = { ...user, profile_pic: base64String };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser)); 
        } else {
          alert("❌ Error: " + data.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsUpdatingPic(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // 🔥 Remove Profile Pic
  const handleRemoveProfilePic = async () => {
    const defaultPic = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png";
    setIsUpdatingPic(true);
    setShowPhotoMenu(false); // Close menu

    try {
      const res = await fetch('https://smart-parking-backend-i15i.onrender.com/api/update-profile-pic', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.user_id, profile_pic: defaultPic })
      });

      if (res.ok) {
        const updatedUser = { ...user, profile_pic: defaultPic };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser)); 
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdatingPic(false);
    }
  };

  const handleSlotAction = (slot, myBooking) => {
    if (slot.db_status === 'Available') {
      if (!user) {
        alert("Please login first to book a slot!");
        router.push('/login');
        return;
      }
      setSelectedSlot(slot);
      setPaymentType('book');
      setShowPayment(true);
    } else if (myBooking) {
      router.push('/my-bookings');
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        if (paymentType === 'book') {
          const response = await fetch('https://smart-parking-backend-i15i.onrender.com/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.user_id, slot_id: selectedSlot.slot_id })
          });
          const data = await response.json();
          if (data.status === 'success') loadData();
          else alert("❌ Error: " + data.error);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsProcessing(false);
        setShowPayment(false);
        setSelectedSlot(null);
      }
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#141311] text-[#E8E5E1] p-8 pt-10 font-sans">
      <div className="max-w-6xl mx-auto">
        
        {/* Navbar */}
        <nav className="flex flex-col md:flex-row justify-between items-center border-b border-[#2A2724] pb-6 mb-12 gap-4">
          <h1 className="text-4xl font-light tracking-[0.1em] uppercase">
            VIP <span className="font-serif italic text-[#C19A6B]">Parking</span>
          </h1>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-bold uppercase tracking-widest relative">
            {user ? (
              <>
                {/* 🔥 Dropdown Container */}
                <div className="relative">
                  <div 
                    onClick={() => setShowPhotoMenu(!showPhotoMenu)} 
                    title="Change Profile Picture"
                    className="flex items-center gap-3 bg-[#1a1917] px-3 py-1.5 rounded-full border border-[#2A2724] cursor-pointer hover:border-[#C19A6B] hover:shadow-[0_0_10px_rgba(193,154,107,0.2)] transition-all group"
                  >
                      <img 
                          src={user.profile_pic || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                          alt="Profile" 
                          className={`w-7 h-7 rounded-full border border-[#C19A6B] object-cover group-hover:opacity-70 transition-opacity ${isUpdatingPic ? 'animate-pulse opacity-50' : ''}`}
                      />
                      <span className="text-[#E8E5E1] text-xs">{isUpdatingPic ? "Updating..." : user.name}</span>
                  </div>

                  {/* 🔥 Dropdown Menu Options */}
                  {showPhotoMenu && (
                    <div className="absolute top-12 left-0 z-50 bg-[#1a1917] border border-[#C19A6B]/50 shadow-xl rounded-md overflow-hidden flex flex-col w-40 animate-[fadeIn_0.2s_ease-out]">
                      <button 
                        onClick={() => fileInputRef.current.click()}
                        className="text-xs text-[#E8E5E1] hover:bg-[#C19A6B]/20 hover:text-[#C19A6B] py-3 px-4 text-left font-bold uppercase tracking-widest transition-colors border-b border-[#2A2724]"
                      >
                        Upload Photo
                      </button>
                      <button 
                        onClick={handleRemoveProfilePic}
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
                    onChange={handleProfilePicUpdate} 
                    className="hidden" 
                  />
                </div>
                
                <button onClick={() => router.push('/my-bookings')} className="text-[#8B8682] hover:text-[#C19A6B] transition-colors">My Bookings</button>
                {user.role === 'admin' && <button onClick={() => router.push('/admin')} className="text-[#9E6B6B] hover:text-red-400 transition-colors">Admin Panel</button>}
                <button onClick={handleLogout} className="text-[#8B8682] hover:text-[#E8E5E1]">Logout</button>
              </>
            ) : (
              <button onClick={() => router.push('/login')} className="text-[#C19A6B]">Login</button>
            )}
          </div>
        </nav>

        {/* Parking Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {slots?.map((slot) => { 
            const myBooking = myActiveBookings?.find(b => String(b.slot_id) === String(slot.slot_id));
            const isClickable = slot.db_status === 'Available' || myBooking;

            return (
              <div 
                key={slot.slot_id} 
                onClick={() => handleSlotAction(slot, myBooking)}
                className={`bg-[#1a1917] border border-[#2A2724] p-8 flex flex-col items-center transition-all group ${
                  isClickable ? 'cursor-pointer hover:border-[#C19A6B]/50 hover:shadow-[0_0_20px_rgba(193,154,107,0.15)]' : 'opacity-80'
                }`}
              >
                <h2 className="text-5xl font-serif mb-6 text-[#E8E5E1] group-hover:text-[#C19A6B] transition-colors">{slot.slot_name}</h2>
                
                <span className={`px-6 py-2 text-sm font-bold uppercase tracking-widest border mb-8 ${
                  slot.db_status === 'Available' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 
                  slot.db_status === 'Parked' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 
                  'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                }`}>
                  {slot.db_status}
                </span>

                <div className="w-full mt-auto">
                  {slot.db_status === 'Available' ? (
                    <div className="w-full bg-[#C19A6B] text-[#141311] font-bold uppercase tracking-widest py-4 text-sm text-center group-hover:bg-[#E8E5E1] transition-colors">
                      Book Slot (₹50)
                    </div>
                  ) : myBooking ? (
                    <div className="w-full bg-transparent border-2 border-blue-400 text-blue-400 font-bold uppercase tracking-wider py-4 text-sm text-center group-hover:bg-blue-400 group-hover:text-[#141311] transition-colors">
                      Manage Booking ➡️
                    </div>
                  ) : (
                    <div className="w-full bg-[#2A2724] text-[#8B8682] font-bold uppercase tracking-widest py-4 text-sm text-center">
                      Taken
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* PAYMENT MODAL */}
        <AnimatePresence>
          {showPayment && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-[#1a1917] border border-[#C19A6B]/50 max-w-lg w-full p-10 relative shadow-2xl">
                <button onClick={() => !isProcessing && setShowPayment(false)} className="absolute top-6 right-6 text-xl text-[#8B8682] hover:text-white">✕</button>
                <h2 className="text-3xl font-serif text-[#C19A6B] mb-2">Secure Checkout</h2>
                
                <p className="text-sm text-[#8B8682] tracking-widest uppercase mb-8 border-b border-[#2A2724] pb-6">
                  {paymentType === 'book' ? `Slot: ${selectedSlot?.slot_name} • Fee: ₹50.00` : `Extending ${selectedSlot?.slot_name} (+30m) • Fee: ₹20.00`}
                </p>

                <div className="flex gap-4 mb-8">
                  <button type="button" onClick={() => setPaymentMethod('card')} className={`flex-1 py-3 text-sm uppercase font-bold tracking-widest border-2 ${paymentMethod === 'card' ? 'bg-[#C19A6B]/20 text-[#C19A6B] border-[#C19A6B]' : 'bg-[#141311] text-[#8B8682] border-[#2A2724]'}`}>Card</button>
                  <button type="button" onClick={() => setPaymentMethod('upi')} className={`flex-1 py-3 text-sm uppercase font-bold tracking-widest border-2 ${paymentMethod === 'upi' ? 'bg-[#C19A6B]/20 text-[#C19A6B] border-[#C19A6B]' : 'bg-[#141311] text-[#8B8682] border-[#2A2724]'}`}>UPI</button>
                </div>

                <form onSubmit={handlePaymentSubmit}>
                  {paymentMethod === 'card' ? (
                    <div className="space-y-5">
                      <input type="text" placeholder="Card Number (XXXX XXXX XXXX)" required maxLength="19" className="w-full bg-[#141311] border border-[#2A2724] px-5 py-3 text-base focus:border-[#C19A6B] outline-none text-[#E8E5E1]" />
                      <div className="flex gap-5">
                        <input type="text" placeholder="MM/YY" required className="w-full bg-[#141311] border border-[#2A2724] px-5 py-3 text-base focus:border-[#C19A6B] outline-none text-[#E8E5E1]" />
                        <input type="password" placeholder="CVV" required maxLength="3" className="w-full bg-[#141311] border border-[#2A2724] px-5 py-3 text-base focus:border-[#C19A6B] outline-none text-[#E8E5E1]" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <div className="bg-white p-3 inline-block rounded-md mb-6 shadow-lg">
                        <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=upi://pay?pa=mock@upi" alt="UPI" className="w-32 h-32" />
                      </div>
                      <input type="text" placeholder="Enter UPI ID (user@upi)" required className="w-full bg-[#141311] border border-[#2A2724] px-5 py-3 text-base focus:border-[#C19A6B] outline-none text-center text-[#E8E5E1]" />
                    </div>
                  )}

                  <button type="submit" disabled={isProcessing} className={`w-full font-bold uppercase tracking-widest py-4 mt-8 text-sm transition-colors ${isProcessing ? 'bg-[#2A2724] text-[#8B8682]' : 'bg-[#C19A6B] text-[#141311] hover:bg-[#E8E5E1]'}`}>
                    {isProcessing ? "Processing Payment..." : (paymentType === 'book' ? "Pay ₹50.00" : "Pay ₹20.00")}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}