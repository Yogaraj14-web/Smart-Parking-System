"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function Home() {
  const router = useRouter();
  
  // App States
  const [slots, setSlots] = useState([]);
  const [user, setUser] = useState(null);
  const [myActiveBookings, setMyActiveBookings] = useState([]);

  // Payment Modal States
  const [showPayment, setShowPayment] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentType, setPaymentType] = useState('book'); 
  const [targetBookingId, setTargetBookingId] = useState(null);

  // Load Slots & User Bookings
  const loadData = async () => {
    try {
      const res = await fetch('http://127.0.0.1:5000/api/slots');
      const data = await res.json();
      if (data.status === "success") setSlots(data.data);
    } catch (error) {
      console.error("Error fetching slots:", error);
    }

    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      try {
        const res = await fetch(`http://127.0.0.1:5000/api/my-bookings/${parsedUser.user_id}`);
        const data = await res.json();
        if (data.status === "success") {
          const active = data.data.filter(b => b.booking_status === 'Active' || b.booking_status === 'Parked');
          setMyActiveBookings(active);
        }
      } catch (error) {
        console.error("Error fetching user bookings:", error);
      }
    }
  };

  useEffect(() => {
    loadData();
    const handleRefresh = () => loadData();
    window.addEventListener('refresh_parking_data', handleRefresh);
    return () => window.removeEventListener('refresh_parking_data', handleRefresh);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  // --- BUTTON ACTIONS --- //
  const handleBookClick = (slot) => {
    if (!user) {
      alert("Please login first to book a slot!");
      router.push('/login');
      return;
    }
    setSelectedSlot(slot);
    setPaymentType('book');
    setShowPayment(true);
  };

  const handleExtendClick = (booking_id, slot) => {
    setSelectedSlot(slot);
    setTargetBookingId(booking_id);
    setPaymentType('extend');
    setShowPayment(true);
  };

  const handleDispute = async (booking_id) => {
    if (!confirm("Is another car parked in your slot? Click OK to alert security and get a new slot.")) return;
    try {
      const res = await fetch('http://127.0.0.1:5000/api/bookings/dispute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: booking_id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        alert("✅ " + data.message);
        loadData();
      } else {
        alert("❌ Error: " + data.message);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    setIsProcessing(true);

    setTimeout(async () => {
      try {
        if (paymentType === 'book') {
          const response = await fetch('http://127.0.0.1:5000/api/book', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.user_id, slot_id: selectedSlot.slot_id })
          });
          const data = await response.json();
          if (data.status === 'success') loadData();
          else alert("❌ Error: " + data.error);
        } else if (paymentType === 'extend') {
          const response = await fetch('http://127.0.0.1:5000/api/extend-time', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ booking_id: targetBookingId, extra_mins: 30 })
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
        setTargetBookingId(null);
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
          <div className="flex gap-6 text-sm font-bold uppercase tracking-widest">
            {user && <button onClick={() => router.push('/my-bookings')} className="text-[#8B8682] hover:text-[#C19A6B] transition-colors">My Bookings</button>}
            {user?.role === 'admin' && <button onClick={() => router.push('/admin')} className="text-[#9E6B6B] hover:text-red-400 transition-colors">Admin Panel</button>}
            {user ? <button onClick={handleLogout} className="text-[#8B8682] hover:text-[#E8E5E1]">Logout</button> : <button onClick={() => router.push('/login')} className="text-[#C19A6B]">Login</button>}
          </div>
        </nav>

        {/* Parking Slots Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {slots.map((slot) => {
            // 🔥 FIXED LOGIC: Safe String Comparison to ensure buttons show up
            const myBooking = myActiveBookings.find(b => String(b.slot_id) === String(slot.slot_id));

            return (
              <div key={slot.slot_id} className="bg-[#1a1917] border border-[#2A2724] p-8 flex flex-col items-center shadow-lg hover:border-[#C19A6B]/30 transition-colors">
                <h2 className="text-5xl font-serif mb-6 text-[#E8E5E1]">{slot.slot_name}</h2>
                
                <span className={`px-6 py-2 text-sm font-bold uppercase tracking-widest border mb-8 ${
                  slot.db_status === 'Available' ? 'text-green-400 border-green-500/30 bg-green-500/10' : 
                  slot.db_status === 'Parked' ? 'text-blue-400 border-blue-500/30 bg-blue-500/10' : 
                  'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
                }`}>
                  {slot.db_status}
                </span>

                {/* THE BUTTON LOGIC - BIGGER & BETTER */}
                <div className="w-full mt-auto">
                  {slot.db_status === 'Available' ? (
                    <button 
                      onClick={() => handleBookClick(slot)} 
                      className="w-full bg-[#C19A6B] text-[#141311] font-bold uppercase tracking-widest py-4 text-sm hover:bg-[#E8E5E1] transition-colors"
                    >
                      Book Slot (₹50)
                    </button>
                  ) : myBooking ? (
                    <div className="flex w-full gap-4">
                      <button 
                        onClick={() => handleExtendClick(myBooking.booking_id, slot)}
                        className="flex-1 bg-transparent border-2 border-blue-400 text-blue-400 font-bold uppercase tracking-wider py-3 text-xs hover:bg-blue-400 hover:text-[#141311] transition-colors"
                      >
                        Extend (+30m)
                      </button>
                      <button 
                        onClick={() => handleDispute(myBooking.booking_id)}
                        className="flex-1 bg-transparent border-2 border-red-500 text-red-500 font-bold uppercase tracking-wider py-3 text-xs hover:bg-red-500 hover:text-[#141311] transition-colors"
                      >
                        Dispute
                      </button>
                    </div>
                  ) : (
                    <button disabled className="w-full bg-[#2A2724] text-[#8B8682] cursor-not-allowed font-bold uppercase tracking-widest py-4 text-sm">
                      Taken
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* PAYMENT MODAL (Bigger Layout) */}
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
                  <button onClick={() => setPaymentMethod('card')} className={`flex-1 py-3 text-sm uppercase font-bold tracking-widest border-2 ${paymentMethod === 'card' ? 'bg-[#C19A6B]/20 text-[#C19A6B] border-[#C19A6B]' : 'bg-[#141311] text-[#8B8682] border-[#2A2724]'}`}>Card</button>
                  <button onClick={() => setPaymentMethod('upi')} className={`flex-1 py-3 text-sm uppercase font-bold tracking-widest border-2 ${paymentMethod === 'upi' ? 'bg-[#C19A6B]/20 text-[#C19A6B] border-[#C19A6B]' : 'bg-[#141311] text-[#8B8682] border-[#2A2724]'}`}>UPI</button>
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