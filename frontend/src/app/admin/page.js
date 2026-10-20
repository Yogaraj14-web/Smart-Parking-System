"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminDashboard() {
  const router = useRouter();
  
  // States for Security Alerts
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  // States for Global Booking History
  const [allBookings, setAllBookings] = useState([]);
  const [filteredBookings, setFilteredBookings] = useState([]);
  const [filterDate, setFilterDate] = useState('');

  const fetchAdminData = () => {
    // 1. Fetch Unauthorized Alerts
    fetch('http://127.0.0.1:5000/api/alerts/unauthorized')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setAlerts(data.violations);
          setLastUpdated(new Date().toLocaleTimeString());
        }
      })
      .catch((err) => console.error("Error fetching alerts:", err));

    // 2. Fetch All Bookings for History
    fetch('http://127.0.0.1:5000/api/admin/bookings')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "success") {
          setAllBookings(data.data);
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
    // SECURITY BOUNCER LOGIC
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      alert("Access Denied! Please login first.");
      router.push('/login');
      return;
    }
    const user = JSON.parse(savedUser);
    if (user.role !== 'admin') {
      alert("Access Denied! You do not have Admin privileges.");
      router.push('/');
      return;
    }

    fetchAdminData();

    // Global Polling Event Listener
    const handleRefresh = () => {
      console.log("⚡ Admin dashboard refreshing via Global Polling...");
      fetchAdminData();
    };

    window.addEventListener('refresh_parking_data', handleRefresh);
    return () => window.removeEventListener('refresh_parking_data', handleRefresh);
  }, [router]);

  // Date Filter Logic
  useEffect(() => {
    if (filterDate) {
      const filtered = allBookings.filter(b => b.booking_date === filterDate);
      setFilteredBookings(filtered);
    } else {
      setFilteredBookings(allBookings);
    }
  }, [filterDate, allBookings]);

  // Global History Clear Logic
  const clearGlobalHistory = async () => {
    if (!confirm("🚨 WARNING: Are you sure you want to WIPE all user booking history? (Active & Parked slots won't be deleted)")) return;
    
    try {
      const res = await fetch(`http://127.0.0.1:5000/api/admin/bookings/clear`, { method: 'DELETE' });
      const data = await res.json();
      if (data.status === 'success') {
        fetchAdminData();
      }
    } catch (error) {
      console.error("Error clearing global history:", error);
    }
  };

  // Animation Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <div className="relative min-h-screen bg-[#141311] text-[#E8E5E1] font-sans overflow-hidden p-8 pt-24">
      
      {/* Background Styling */}
      <div className="absolute inset-0 z-0 opacity-10 bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2000&auto=format&fit=crop')" }}></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#141311]/80 via-[#141311] to-[#2a0808]/20"></div>

      <div className="relative z-10 max-w-6xl mx-auto">
        
        {/* Admin Header (UPDATED WITH SCANNER BUTTON) */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-end border-b border-[#2A2724] pb-6 gap-4">
          <div>
            <p className="text-[#9E6B6B] font-semibold tracking-[0.3em] text-xs mb-2 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Superadmin Privileges Active
            </p>
            <h1 className="text-4xl font-light tracking-[0.1em] uppercase">
              Admin <span className="font-serif italic text-[#C19A6B]">Dashboard</span>
            </h1>
          </div>
          
          <div className="flex flex-col md:items-end gap-4">
            <div className="text-left md:text-right">
              <p className="text-[#8B8682] text-[10px] tracking-widest uppercase">Last System Sync</p>
              <p className="text-[#E8E5E1] text-sm font-mono">{lastUpdated || '--:--:--'}</p>
            </div>
            
            {/* 🔥 NEW QR SCANNER NAVIGATION BUTTON 🔥 */}
            <button 
              onClick={() => router.push('/admin/scanner')}
              className="bg-[#C19A6B] text-[#141311] px-6 py-2.5 hover:bg-[#E8E5E1] transition-colors uppercase tracking-[0.1em] text-xs font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(193,154,107,0.3)]"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
              Open QR Scanner
            </button>
          </div>
        </header>

        {/* SECTION 1: LIVE SECURITY ALERTS (Top Priority) */}
        <div className="mb-16">
          <h2 className="text-xl font-light tracking-widest uppercase mb-6 flex items-center gap-3">
            Unauthorized Parking Alerts 
            <span className="bg-[#9E6B6B]/20 text-[#9E6B6B] px-3 py-1 text-xs font-bold rounded-sm border border-[#9E6B6B]/30">
              {alerts.length} Violations
            </span>
          </h2>

          {loading ? (
            <div className="text-[#C19A6B] animate-pulse tracking-widest text-sm">Scanning premises...</div>
          ) : alerts.length === 0 ? (
            <div className="bg-[#859E7A]/10 border border-[#859E7A]/30 p-8 text-center text-[#859E7A]">
              <p className="tracking-widest uppercase text-sm font-semibold mb-1">All Clear</p>
              <p className="text-xs opacity-70">No unauthorized vehicles detected in the VIP zones.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.map((violation, index) => (
                <div key={index} className="bg-[#2a0808]/40 border border-red-500/30 p-6 flex flex-col relative overflow-hidden group hover:bg-[#2a0808]/60 transition-colors">
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-3xl font-serif text-[#E8E5E1] group-hover:text-red-400 transition-colors">{violation.slot_name}</h3>
                    <span className="text-[10px] tracking-widest bg-red-500/20 text-red-400 px-2 py-1 border border-red-500/20 font-bold uppercase">Action Req</span>
                  </div>
                  <p className="text-[#8B8682] text-xs leading-relaxed mb-4">System shows this slot as Available, but hardware sensors detect a vehicle.</p>
                  <button className="mt-auto w-full py-2.5 text-[10px] tracking-[0.2em] font-semibold uppercase bg-[#141311] text-[#E8E5E1] border border-[#2A2724] hover:border-red-500/50 hover:text-red-400 transition-colors">
                    Dispatch Security
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SECTION 2: GLOBAL SYSTEM HISTORY */}
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <h2 className="text-xl font-light tracking-widest uppercase flex items-center gap-3">
              Global System History
              <span className="bg-[#C19A6B]/20 text-[#C19A6B] px-3 py-1 text-xs font-bold rounded-sm border border-[#C19A6B]/30">
                {filteredBookings.length} Records
              </span>
            </h2>
            
            {/* Filter & Clear Controls */}
            <div className="flex items-center gap-4">
              <input 
                type="date" 
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="bg-[#2A2724] text-[#E8E5E1] border border-[#C19A6B]/30 px-3 py-1.5 text-sm outline-none focus:border-[#C19A6B] transition-colors"
              />
              {filterDate && (
                <button onClick={() => setFilterDate('')} className="text-xs text-[#9E6B6B] hover:text-red-400 uppercase tracking-widest">Clear Filter</button>
              )}
              <button 
                onClick={clearGlobalHistory}
                className="bg-transparent border border-red-500/50 text-red-400 px-4 py-1.5 hover:bg-red-500/10 transition-colors uppercase tracking-[0.1em] text-xs font-semibold"
              >
                Wipe History
              </button>
            </div>
          </div>

          {/* History Grid */}
          {filteredBookings.length === 0 ? (
            <div className="text-center text-[#8B8682] py-12 border border-[#2A2724] bg-[#2A2724]/20 text-sm">
              No booking records found in the system.
            </div>
          ) : (
            <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence>
                {filteredBookings.map((booking) => {
                  let statusColor = "text-[#8B8682]";
                  if (booking.booking_status === 'Active') statusColor = "text-green-400";
                  if (booking.booking_status === 'Parked') statusColor = "text-blue-400";
                  if (booking.booking_status === 'Completed') statusColor = "text-[#C19A6B]";
                  if (booking.booking_status === 'Expired') statusColor = "text-red-400";

                  return (
                    <motion.div 
                      key={booking.booking_id}
                      variants={itemVariants}
                      exit={{ opacity: 0, scale: 0.9 }}
                      whileHover={{ scale: 1.01 }}
                      className="flex justify-between items-center bg-[#1a1917] border border-[#2A2724] p-4 hover:border-[#C19A6B]/30 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className="text-xl font-serif text-[#E8E5E1]">{booking.slot_name}</h3>
                          <span className={`text-[10px] font-bold tracking-widest uppercase ${statusColor}`}>
                            • {booking.booking_status}
                          </span>
                        </div>
                        <p className="text-[#8B8682] text-xs"><span className="text-[#E8E5E1]">User:</span> {booking.user_name} ({booking.vehicle_number})</p>
                        <p className="text-[#8B8682] text-xs mt-1"><span className="text-[#E8E5E1]">Date:</span> {booking.booking_date} | {booking.booking_time_formatted}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>

      </div>
    </div>
  );
}