"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

export default function MyBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Fetch user's bookings from backend
  const fetchMyBookings = (userId) => {
    setLoading(true);
    fetch(`http://127.0.0.1:5000/api/my-bookings/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setBookings(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      alert("Please login to view your bookings.");
      router.push('/login');
      return;
    }
    const user = JSON.parse(savedUser);
    setCurrentUser(user);
    fetchMyBookings(user.user_id);
  }, [router]);
  // 🔥 THE WEBSOCKET LISTENER (Live Magic)
  useEffect(() => {
    if (!currentUser) return;

    // Python server kooda live phone call connect pandrom
    const socket = io('http://127.0.0.1:5000' , {transports: ['polling']});

    // Server-la irundhu 'live_update' signal vandha enna pannanum?
    socket.on('live_update', (data) => {
      console.log("⚡ Live Update Received from Sensor:", data);
      
      // Signal vandha udane UI-a background-la refresh pandrom (Endha button-um amukkama!)
      fetchMyBookings(currentUser.user_id);
    });

    // Component close aagumbodhu call-a cut pandrom
    return () => {
      socket.disconnect();
    };
  }, [currentUser]);

  // 2. Extend Time Logic
  const handleExtendTime = async (bookingId, slotName) => {
    if (!window.confirm(`Add 30 extra minutes to ${slotName}?`)) return;

    try {
      const response = await fetch('http://127.0.0.1:5000/api/extend-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          booking_id: bookingId,
          extra_mins: 30
        })
      });

      const data = await response.json();
      if (response.ok) {
        alert("Success! Time extended by 30 mins.");
        fetchMyBookings(currentUser.user_id);
      } else {
        alert(data.error || 'Failed to extend time.');
      }
    } catch (error) {
      alert("Server error.");
    }
  };

  // 3. Dispute Logic (The "Taken" Button)
  const handleSlotDispute = async (bookingId) => {
    const isConfirmed = window.confirm("Are you sure someone else parked in your slot? We will assign you a new slot immediately.");
    
    if (!isConfirmed) return;

    try {
      const response = await fetch('http://127.0.0.1:5000/api/bookings/dispute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          booking_id: bookingId
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(`✅ Success! ${data.message}`);
        fetchMyBookings(currentUser.user_id); // Auto-refresh to show the new slot!
      } else {
        alert(`❌ Error: ${data.message || data.error || 'Something went wrong. Please try again.'}`);
      }
    } catch (error) {
      console.error("Error reporting dispute:", error);
      alert("Network error. Please check your backend.");
    }
  };

  return (
    <div className="relative min-h-screen bg-[#141311] text-[#E8E5E1] font-sans selection:bg-[#C19A6B] selection:text-black overflow-hidden p-8">
      
      {/* Background */}
      <div 
        className="absolute inset-0 z-0 opacity-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1485291571150-772bcfc10da5?q=80&w=2000&auto=format&fit=crop')" }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#141311]/80 via-[#141311] to-[#141311]"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        
        {/* Header Navigation */}
        <header className="mb-12 flex justify-between items-end border-b border-[#2A2724] pb-6">
          <div>
            <p className="text-[#C19A6B] font-semibold tracking-[0.3em] text-xs mb-2 uppercase">
              {currentUser?.name}'s History
            </p>
            <h1 className="text-4xl font-light tracking-[0.1em] uppercase">
              My <span className="font-serif italic text-[#C19A6B]">Bookings</span>
            </h1>
          </div>
          <button 
            onClick={() => router.push('/')}
            className="text-[10px] tracking-widest text-[#8B8682] hover:text-[#C19A6B] uppercase font-bold transition-colors border border-[#2A2724] px-4 py-2"
          >
            Back to Dashboard
          </button>
        </header>

        {/* Bookings List */}
        {loading ? (
          <div className="text-[#C19A6B] animate-pulse tracking-widest text-sm text-center py-10">Fetching your VIP passes...</div>
        ) : bookings.length === 0 ? (
          <div className="bg-[#1E1C1A]/50 border border-[#2A2724] p-12 text-center">
            <p className="tracking-widest uppercase text-sm text-[#8B8682] mb-4">No active bookings found</p>
            <button onClick={() => router.push('/')} className="text-xs text-[#141311] bg-[#C19A6B] px-6 py-3 uppercase tracking-widest hover:bg-[#E2C096] transition-colors">
              Book a Slot Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookings.map((booking) => (
              <div 
                key={booking.booking_id}
                className="bg-[#1E1C1A]/80 backdrop-blur-sm border border-[#2A2724] p-6 flex flex-col hover:border-[#C19A6B]/50 transition-all duration-300 group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-3xl font-serif text-[#E8E5E1] group-hover:text-[#C19A6B] transition-colors">
                      {booking.slot_name}
                    </h3>
                    <p className="text-[10px] tracking-widest text-[#8B8682] uppercase mt-2">
                      Booking ID: #{booking.booking_id}
                    </p>
                  </div>
                  <span className={`text-[10px] tracking-widest px-2 py-1 font-bold uppercase ${booking.booking_status === 'Active' ? 'bg-[#859E7A]/20 text-[#859E7A] border border-[#859E7A]/30' : 'bg-[#9E6B6B]/20 text-[#9E6B6B] border border-[#9E6B6B]/30'}`}>
                    {booking.booking_status}
                  </span>
                </div>
                
                <div className="flex justify-between items-end mt-auto pt-6 border-t border-[#2A2724]/50">
                  <div>
                    <p className="text-[10px] tracking-widest text-[#8B8682] uppercase">Extended Time</p>
                    <p className="text-sm text-[#E8E5E1] font-mono mt-1">
                      {booking.extended_time_mins || 0} Mins
                    </p>
                  </div>
                  
                  {/* Action Buttons Container */}
                  {booking.booking_status === 'Active' && (
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleSlotDispute(booking.booking_id)}
                        className="flex items-center gap-1 text-[10px] tracking-widest font-bold uppercase bg-[#9E6B6B]/10 text-[#9E6B6B] border border-[#9E6B6B]/30 px-3 py-2 hover:bg-[#9E6B6B] hover:text-[#141311] transition-colors"
                        title="Report unauthorized parking"
                      >
                        <span>⚠️</span> Taken?
                      </button>

                      <button 
                        onClick={() => handleExtendTime(booking.booking_id, booking.slot_name)}
                        className="text-[10px] tracking-widest font-bold uppercase bg-[#C19A6B]/10 text-[#C19A6B] border border-[#C19A6B]/30 px-4 py-2 hover:bg-[#C19A6B] hover:text-[#141311] transition-colors"
                      >
                        +30 Mins
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}