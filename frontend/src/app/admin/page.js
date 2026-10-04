"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
  const router = useRouter();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  const fetchAlerts = () => {
    fetch('http://127.0.0.1:5000/api/alerts/unauthorized')
      .then((response) => response.json())
      .then((data) => {
        if (data.status === "success") {
          setAlerts(data.violations);
          setLastUpdated(new Date().toLocaleTimeString());
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error fetching alerts:", error);
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

    // Initial fetch
    fetchAlerts();

    // 🔥 Global Polling Event Listener (Instant UI Update across all pages)
    const handleRefresh = () => {
      console.log("⚡ Admin dashboard refreshing via Global Polling...");
      fetchAlerts();
    };

    window.addEventListener('refresh_parking_data', handleRefresh);

    return () => {
      window.removeEventListener('refresh_parking_data', handleRefresh);
    };
  }, [router]);

  return (
    <div className="relative min-h-screen bg-[#141311] text-[#E8E5E1] font-sans overflow-hidden p-8">
      
      {/* Dark/Red Warning Background Vibe */}
      <div 
        className="absolute inset-0 z-0 opacity-10 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('https://images.unsplash.com/photo-1506521781263-d8422e82f27a?q=80&w=2000&auto=format&fit=crop')" }}
      ></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-b from-[#141311]/80 via-[#141311] to-[#2a0808]/20"></div>

      <div className="relative z-10 max-w-5xl mx-auto">
        
        {/* Admin Header */}
        <header className="mb-12 flex justify-between items-end border-b border-[#2A2724] pb-6">
          <div>
            <p className="text-[#9E6B6B] font-semibold tracking-[0.3em] text-xs mb-2 uppercase flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Live Security Feed
            </p>
            <h1 className="text-4xl font-light tracking-[0.1em] uppercase">
              Admin <span className="font-serif italic text-[#C19A6B]">Dashboard</span>
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[#8B8682] text-[10px] tracking-widest uppercase">Last Updated</p>
            <p className="text-[#E8E5E1] text-sm font-mono">{lastUpdated || '--:--:--'}</p>
          </div>
        </header>

        {/* Alerts Section */}
        <div>
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
                <div 
                  key={index}
                  className="bg-[#2a0808]/40 border border-red-500/30 p-6 flex flex-col relative overflow-hidden group hover:bg-[#2a0808]/60 transition-colors"
                >
                  <div className="absolute top-0 left-0 w-1 h-full bg-red-500 animate-pulse"></div>
                  
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-3xl font-serif text-[#E8E5E1] group-hover:text-red-400 transition-colors">
                      {violation.slot_name}
                    </h3>
                    <span className="text-[10px] tracking-widest bg-red-500/20 text-red-400 px-2 py-1 border border-red-500/20 font-bold uppercase">
                      Action Req
                    </span>
                  </div>
                  
                  <p className="text-[#8B8682] text-xs leading-relaxed mb-4">
                    System shows this slot as <span className="text-[#C19A6B]">Available</span>, but hardware sensors detect a vehicle is parked here.
                  </p>

                  <button className="mt-auto w-full py-2.5 text-[10px] tracking-[0.2em] font-semibold uppercase bg-[#141311] text-[#E8E5E1] border border-[#2A2724] hover:border-red-500/50 hover:text-red-400 transition-colors">
                    Send Guard to {violation.slot_name}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}