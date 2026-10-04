// components/SocketListener.js
"use client";
import { useEffect } from 'react';
import { io } from 'socket.io-client';

export default function SocketListener() {
  useEffect(() => {
    // Python backend WebSocket-kulla connect pandrom
    const socket = io('http://127.0.0.1:5000' ,  { transports : ['polling'] } );
    

    socket.on('live_update', (data) => {
      console.log("⚡ Global Live Update Received:", data);
      
      // Ellaa pages-kum oru custom event-a trigger pandrom
      window.dispatchEvent(new Event('refresh_parking_data'));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return null; // Idhu screen-la theriyathu, background-la watchman mathiri vela seiyum
}