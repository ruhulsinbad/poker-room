import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { TonConnectUIProvider } from '@tonconnect/ui-react';
import Home from "./pages/Home";
import Game from "./pages/Game";
import Tasks from "./pages/Tasks";
import Admin from "./pages/Admin";
import { Leaderboard, Profile, NFTPage, BottomNav, LoadingScreen } from "./pages/pages.jsx";
import { TaskPushListener } from "./pages/GameFeatures.jsx";
import { useStore } from "./store/useStore";
import "./styles/globals.css";

const MANIFEST_URL = "https://randy-male-exactly-psychological.trycloudflare.com/tonconnect-manifest.json";

export default function App() {
  const [loading, setLoading] = useState(true);
  const { setUser, setToken, token } = useStore();
  const [socket, setSocket] = useState(null);

  useEffect(() => { initApp(); }, []);

  // Global socket for task push notifications
  useEffect(() => {
    if (!token) return;
    import('socket.io-client').then(({ io }) => {
      const s = io(import.meta.env.VITE_API_URL, { auth: { token } });
      s.on('connect', () => setSocket(s));
      return () => s.disconnect();
    });
  }, [token]);

  async function initApp() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.token) setToken(data.token);
      }
    } catch (err) {
      console.error("Init error:", err);
    } finally {
      setTimeout(() => setLoading(false), 1000);
    }
  }

  if (loading) return <LoadingScreen />;

  return (
    <TonConnectUIProvider manifestUrl={MANIFEST_URL}>
      <Router>
        <div className="app">
          <TaskPushListener socket={socket} />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/game/:tableId" element={<Game />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/nft" element={<NFTPage />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          <BottomNav />
        </div>
      </Router>
    </TonConnectUIProvider>
  );
}
