"use client";
import { useState, useEffect } from 'react';

export default function Home() {
  const [slots, setSlots] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const fetchSlots = () => {
    fetch('http://127.0.0.1:5000/api/slots')
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setSlots(data.data); 
        }
      })
      .catch((error) => console.error("Error fetching slots:", error));
  };

  useEffect(() => {
    fetchSlots(); 
    
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []); 

  useEffect(() => {
    const handleRefresh = () => {
      // Inga unga page-oda fetch function-a podunga (eg: fetchSlots() or fetchMyBookings())
      console.log("Refreshing data automatically via WebSocket...");
      fetchSlots(); 
    };

    window.addEventListener('refresh_parking_data', handleRefresh);
    return () => {
      window.removeEventListener('refresh_parking_data', handleRefresh);
    };
  }, []);

  const handleReserveClick = async (slotId, slotName) => {
    if (!currentUser) {
      alert(`You selected ${slotName}. Please Login to reserve this VIP slot!`);
      window.location.href = '/login';
      return;
    }

    if (!window.confirm(`Are you sure you want to book ${slotName}?`)) {
      return; 
    }

    try {
      const response = await fetch('http://127.0.0.1:5000/api/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser.user_id, 
          slot_id: slotId
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(data.message || `Success! ${slotName} is booked for you.`);
        fetchSlots(); 
      } else {
        alert(data.error || 'Failed to book slot.');
      }
    } catch (error) {
      alert("Server error. Please try again later.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    alert("Logged out successfully!");
  };

  return (
    <div className="relative min-h-screen bg-[#141311] text-[#E8E5E1] font-sans selection:bg-[#C19A6B] selection:text-black overflow-hidden">
      
      {/* Cinematic Background Image with Fade Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-15 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1485291571150-772bcfc10da5?q=80&w=2000&auto=format&fit=crop')" }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#141311]/50 via-transparent to-[#141311]"></div>

      {/* Header with User Info, Admin, Bookings & Logout */}
      <div className="relative z-20 flex justify-end p-6 w-full max-w-7xl mx-auto">
        {currentUser ? (
          <div className="flex items-center gap-4 bg-[#1E1C1A]/80 backdrop-blur-sm border border-[#2A2724] px-4 py-2 rounded-none">
            
            {/* Admin Panel Link (Only for admins) */}
            {currentUser.role === 'admin' && (
              <>
                <a href="/admin" className="text-[10px] tracking-widest text-[#859E7A] hover:text-green-400 uppercase font-bold transition-colors">
                  Admin Panel
                </a>
                <div className="w-[1px] h-4 bg-[#2A2724]"></div>
              </>
            )}

            {/* My Bookings Link (For ALL logged in users) - PUDHUSA ADD PANNIRUKKOM */}
            <a href="/my-bookings" className="text-[10px] tracking-widest text-[#E8E5E1] hover:text-[#C19A6B] uppercase font-bold transition-colors">
              My Bookings
            </a>
            <div className="w-[1px] h-4 bg-[#2A2724]"></div>

            <span className="text-[10px] tracking-widest text-[#C19A6B] uppercase font-bold">
              VIP: <span className="text-[#E8E5E1] font-normal">{currentUser.name}</span>
            </span>
            <div className="w-[1px] h-4 bg-[#2A2724]"></div>
            
            <button 
              onClick={handleLogout}
              className="text-[10px] tracking-widest text-[#9E6B6B] hover:text-red-400 uppercase font-bold transition-colors"
            >
              Logout
            </button>
          </div>
        ) : (
          <a href="/login" className="text-[10px] tracking-widest text-[#C19A6B] hover:text-[#E2C096] uppercase font-bold transition-colors border border-[#C19A6B]/50 px-4 py-2 bg-[#1E1C1A]/50">
            Member Login
          </a>
        )}
      </div>

      {/* Main Content */}
      <div className="relative z-10 px-8 pb-16 pt-4 flex flex-col items-center justify-center min-h-[80vh]">
        
        {/* Animated Header */}
        <header className="mb-16 text-center animate-[fadeIn_1s_ease-in-out]">
          <p className="text-[#C19A6B] font-semibold tracking-[0.3em] text-sm mb-3 uppercase">
            Grand Cinemas
          </p>
          <h1 className="text-5xl md:text-7xl font-light tracking-[0.1em] uppercase drop-shadow-lg">
            VIP <span className="text-[#C19A6B] font-serif italic">Parking</span>
          </h1>
          <div className="flex items-center justify-center gap-4 mt-6 opacity-80">
            <div className="h-[1px] w-16 bg-[#C19A6B]/50"></div>
            <p className="text-[#8B8682] font-light tracking-[0.2em] text-xs uppercase">
              Real-time Slot Allocation
            </p>
            <div className="h-[1px] w-16 bg-[#C19A6B]/50"></div>
          </div>
        </header>

        {/* The Architectural Grid */}
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {slots.length === 0 ? (
            <p className="text-center col-span-full text-[#C19A6B] tracking-widest animate-pulse">Loading real-time slots...</p>
          ) : (
            slots.map((slot, index) => (
              <div 
                key={slot.slot_id} 
                className="bg-[#1E1C1A]/80 backdrop-blur-sm border border-[#2A2724] p-8 flex flex-col items-center transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_10px_30px_rgba(193,154,107,0.1)] hover:border-[#C19A6B]/50 group"
                style={{ animation: `fadeIn 0.5s ease-out ${index * 0.15}s both` }}
              >
                <div className="text-3xl font-serif text-[#E8E5E1] mb-1 group-hover:text-[#C19A6B] transition-colors duration-500">
                  {slot.slot_name}
                </div>
                
                <div className={`mt-2 mb-8 text-[10px] tracking-widest uppercase font-bold transition-colors ${
                  slot.db_status === 'Available' ? 'text-[#859E7A]' : 'text-[#9E6B6B]'
                }`}>
                  • {slot.db_status}
                </div>

                <button 
                  disabled={slot.db_status === 'Booked'}
                  onClick={() => handleReserveClick(slot.slot_id, slot.slot_name)} 
                  className={`w-full py-3.5 text-xs tracking-[0.15em] font-semibold uppercase transition-all duration-300 ${
                    slot.db_status === 'Available' 
                      ? 'bg-[#C19A6B] text-[#141311] hover:bg-[#E2C096] hover:shadow-[0_0_15px_rgba(193,154,107,0.4)]' 
                      : 'bg-[#141311] text-[#4A4540] border border-[#2A2724] cursor-not-allowed'
                  }`}
                >
                  {slot.db_status === 'Available' ? 'Reserve' : 'Occupied'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}