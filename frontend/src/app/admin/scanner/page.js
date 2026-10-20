"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Scanner } from '@yudiel/react-qr-scanner';
import { motion, AnimatePresence } from 'framer-motion';

export default function AdminScanner() {
  const router = useRouter();
  const [scanResult, setScanResult] = useState(null);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    // 🛡️ SECURITY BOUNCER LOGIC
    const savedUser = localStorage.getItem('user');
    if (!savedUser) {
      alert("Access Denied!");
      router.push('/login');
      return;
    }
    const user = JSON.parse(savedUser);
    if (user.role !== 'admin') {
      alert("Access Denied! Security Guards Only.");
      router.push('/');
    }
  }, [router]);

  // 🔥 UPDATED: To handle the latest QR Scanner data format
  const handleDecode = async (result) => {
    if (!isScanning || !result) return;
    setIsScanning(false);

    try {
      // Version 2+ returns an array of objects, Version 1 returns a string
      const text = Array.isArray(result) ? result[0].rawValue : result;
      
      console.log("Decoded Text:", text); // Debugging-ku udhavum
      
      const qrData = JSON.parse(text);
      
      // Send to Backend API
      const res = await fetch('http://127.0.0.1:5000/api/verify-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: qrData.id })
      });
      const data = await res.json();
      
      setScanResult(data);
      
      // Custom Error Beep (Success beep is handled by the library itself)
      if(data.status !== 'success') {
          const audio = new Audio('https://www.soundjay.com/buttons/beep-10.wav');
          audio.play().catch(e => console.log(e));
      }

    } catch (err) {
      console.error("Invalid QR format:", err);
      setScanResult({ status: 'error', message: '❌ INVALID FORMAT! Not a system QR.' });
      const audio = new Audio('https://www.soundjay.com/buttons/beep-10.wav');
      audio.play().catch(e => console.log(e));
    }
  };

  const resetScanner = () => {
    setScanResult(null);
    setIsScanning(true);
  };

  return (
    <div className="min-h-screen bg-[#141311] text-[#E8E5E1] font-sans p-8 pt-24 flex flex-col items-center">
      
      <header className="w-full max-w-2xl text-center mb-10">
        <p className="text-[#9E6B6B] font-semibold tracking-[0.3em] text-xs mb-2 uppercase flex justify-center items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Security Portal
        </p>
        <h1 className="text-3xl font-light tracking-[0.1em] uppercase">
          QR <span className="font-serif italic text-[#C19A6B]">Verification</span>
        </h1>
      </header>

      <div className="w-full max-w-md bg-[#1a1917] border border-[#2A2724] p-4 relative overflow-hidden shadow-2xl">
        
        {/* Camera Scanner View */}
        {isScanning ? (
          <div className="rounded-md overflow-hidden border border-[#C19A6B]/30">
            {/* 🔥 UPDATED PROPS: onScan instead of onResult */}
            <Scanner 
                onScan={handleDecode} 
                onError={(error) => console.log("Scanner Error:", error?.message)}
                
            />
            <p className="text-center text-[#8B8682] text-xs mt-4 tracking-widest uppercase animate-pulse">
              Align QR Code within the frame
            </p>
          </div>
        ) : (
          /* Result Overlay */
          <AnimatePresence>
            {scanResult && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }} 
                animate={{ opacity: 1, scale: 1 }} 
                className="py-10 flex flex-col items-center text-center"
              >
                {scanResult.status === 'success' ? (
                  <div className="text-green-400">
                    <h2 className="text-2xl font-bold mb-2">{scanResult.message}</h2>
                    <div className="bg-green-500/10 border border-green-500/30 p-4 mt-4 w-full">
                      <p className="text-[#E8E5E1] text-xl font-serif">{scanResult.data?.slot_name}</p>
                      <p className="text-[#8B8682] text-sm mt-1">Vehicle: {scanResult.data?.vehicle_number}</p>
                      <p className="text-[#8B8682] text-sm">Owner: {scanResult.data?.user_name}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-red-500">
                    <h2 className="text-2xl font-bold mb-4">{scanResult.message}</h2>
                    <p className="text-[#8B8682] text-sm">Do not allow entry.</p>
                  </div>
                )}

                <button 
                  onClick={resetScanner}
                  className="mt-8 bg-transparent border border-[#C19A6B] text-[#C19A6B] px-6 py-2 hover:bg-[#C19A6B] hover:text-black transition-colors uppercase tracking-[0.1em] text-xs font-semibold"
                >
                  Scan Next Vehicle
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <button onClick={() => router.push('/admin')} className="mt-8 text-[#8B8682] hover:text-[#E8E5E1] text-xs uppercase tracking-widest underline">
        Back to Dashboard
      </button>

    </div>
  );
}