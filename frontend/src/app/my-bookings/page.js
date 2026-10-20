"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import QRCode from 'react-qr-code';
import { motion, AnimatePresence } from 'framer-motion';

export default function MyBookings() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [filterDate, setFilterDate] = useState('');

  // 1. Fetch Bookings
  const fetchBookings = (userId) => {
    fetch(`http://127.0.0.1:5000/api/my-bookings/${userId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setBookings(data.data);
          setFilteredBookings(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching bookings:", err);
        setLoading(false);
      });
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      router.push('/login');
      return;
    }
    const parsedUser = JSON.parse(savedUser);
    setUser(parsedUser);
    fetchBookings(parsedUser.user_id);

    // Global Polling Event Listener
    const handleRefresh = () => {
      fetchBookings(parsedUser.user_id);
    };
    window.addEventListener('refresh_parking_data', handleRefresh);
    return () => window.removeEventListener('refresh_parking_data', handleRefresh);
  }, [router]);

  // 2. Date Filter Logic
  useEffect(() => {
    if (filterDate) {
      const filtered = bookings.filter(b => b.booking_date === filterDate);
      setFilteredBookings(filtered);
    } else {
      setFilteredBookings(bookings);
    }
  }, [filterDate, bookings]);

  // 3. Clear History Logic
  const clearHistory = async () => {
    if (!confirm("Are you sure you want to clear old booking history? (Active & Parked slots won't be deleted)")) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/my-bookings/clear/${user.user_id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchBookings(user.user_id);
      }
    } catch (error) {
      console.error("Error clearing history:", error);
    }
  };

  // 4. Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if (loading) return <div className="min-h-screen bg-[#141311] flex justify-center items-center text-[#C19A6B] animate-pulse">Loading Bookings...</div>;

  return (
    <div className="min-h-screen bg-[#141311] text-[#E8E5E1] font-sans p-8 pt-24">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="flex flex-col md:flex-row justify-between items-center mb-12 border-b border-[#2A2724] pb-6"
        >
          <div>
            <h1 className="text-4xl font-light tracking-[0.1em] uppercase">
              My <span className="font-serif italic text-[#C19A6B]">Bookings</span>
            </h1>
            <p className="text-[#8B8682] text-sm mt-2">Manage your VIP parking history</p>
          </div>
          
          {/* Controls: Date Filter & Clear History */}
          <div className="flex items-center gap-4 mt-6 md:mt-0">
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-[#2A2724] text-[#E8E5E1] border border-[#C19A6B]/30 px-4 py-2 outline-none focus:border-[#C19A6B] transition-colors"
            />
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="text-xs text-[#9E6B6B] hover:text-red-400 uppercase tracking-widest">Clear Filter</button>
            )}
            <button 
              onClick={clearHistory}
              className="bg-transparent border border-red-500/50 text-red-400 px-4 py-2 hover:bg-red-500/10 transition-colors uppercase tracking-[0.1em] text-xs font-semibold"
            >
              Clear History
            </button>
          </div>
        </motion.header>

        {/* Bookings Grid */}
        {filteredBookings.length === 0 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-[#8B8682] py-20 border border-[#2A2724] bg-[#2A2724]/20">
            No bookings found for the selected criteria.
          </motion.div>
        ) : (
          <motion.div 
            variants={containerVariants} 
            initial="hidden" 
            animate="show" 
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            <AnimatePresence>
              {filteredBookings.map((booking) => {
                
                // Status Color Logic
                let statusColor = "text-[#8B8682]";
                let borderColor = "border-[#2A2724]";
                if (booking.booking_status === 'Active') { statusColor = "text-green-400"; borderColor = "border-green-500/30"; }
                if (booking.booking_status === 'Parked') { statusColor = "text-blue-400"; borderColor = "border-blue-500/30"; }
                if (booking.booking_status === 'Completed') { statusColor = "text-[#C19A6B]"; }
                if (booking.booking_status === 'Expired') { statusColor = "text-red-400"; }

                // QR Code Data (Vehicle Verification)
                const qrData = JSON.stringify({
                  id: booking.booking_id,
                  vehicle: booking.vehicle_number,
                  slot: booking.slot_name,
                  status: booking.booking_status
                });

                return (
                  <motion.div 
                    key={booking.booking_id}
                    variants={itemVariants}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={{ scale: 1.02 }}
                    className={`flex flex-col md:flex-row bg-[#1a1917] border ${borderColor} p-6 relative overflow-hidden group transition-all duration-300 hover:shadow-[0_0_20px_rgba(193,154,107,0.1)]`}
                  >
                    {/* Left: Info */}
                    <div className="flex-1 pr-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-3xl font-serif text-[#E8E5E1]">{booking.slot_name}</h3>
                        <span className={`text-xs font-bold tracking-widest uppercase px-2 py-1 bg-black/50 border ${borderColor} ${statusColor}`}>
                          {booking.booking_status}
                        </span>
                      </div>
                      
                      <div className="space-y-1 mt-4">
                        <p className="text-[#8B8682] text-sm"><span className="text-[#E8E5E1]">Date:</span> {booking.booking_date} | {booking.booking_time_formatted}</p>
                        <p className="text-[#8B8682] text-sm"><span className="text-[#E8E5E1]">Vehicle:</span> {booking.vehicle_number}</p>
                        {booking.extended_time_mins > 0 && (
                          <p className="text-[#C19A6B] text-xs mt-2">+ {booking.extended_time_mins} mins extended</p>
                        )}
                      </div>
                    </div>

                    {/* Right: QR Code */}
                    <div className="mt-6 md:mt-0 md:pl-6 md:border-l border-[#2A2724] flex flex-col items-center justify-center">
                      <div className="bg-white p-2 rounded-sm shadow-md">
                        <QRCode value={qrData} size={90} level="H" />
                      </div>
                      <p className="text-[10px] text-[#8B8682] tracking-widest uppercase mt-3">Scan to Verify</p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </div>
  );
}