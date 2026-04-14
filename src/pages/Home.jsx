// Home.jsx — Fixed: modal button not hidden by navbar

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";

export default function Home() {
  const { user, api, showNotification } = useStore();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buyInModal, setBuyInModal] = useState(null);
  const [buyInAmount, setBuyInAmount] = useState(0);

  useEffect(() => {
    loadTables();
    const interval = setInterval(loadTables, 10000);
    return () => clearInterval(interval);
  }, []);

  async function loadTables() {
    try {
      const data = await api("/api/tables");
      setTables(data);
    } catch {}
    finally { setLoading(false); }
  }

  function openBuyIn(table) {
    setBuyInAmount(table.min_buy_in);
    setBuyInModal(table);
  }

  function joinTable() {
    navigate(`/game/${buyInModal.id}?buyin=${buyInAmount}`);
    setBuyInModal(null);
  }

  const formatChips = (n) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n?.toLocaleString() || "0";
  };

  const chipsLabel = (t) => t.chips_type === "premium_chips" ? "💎 Premium" : "🪙 Regular";

  const userChipsForTable = (table) =>
    table.chips_type === "premium_chips" ? (user?.premium_chips || 0) : (user?.chips || 0);

  return (
    <div className="page">
      {/* Header */}
      <div className="px-16" style={{ paddingBottom: 16, borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: "1.4rem", color: "var(--gold)", textShadow: "0 0 20px rgba(201,168,76,0.5)", letterSpacing: 2, marginBottom: 14 }}>
          ♠ ROYAL POKER
        </div>

        {/* Balance row */}
        <div style={{ display: "flex", background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", overflow: "hidden", marginBottom: 12 }}>
          {[
            ["🪙 Chips", formatChips(user?.chips)],
            ["💎 Premium", formatChips(user?.premium_chips)],
            ["⭐ Level", user?.level || 1],
          ].map(([label, value], i) => (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "10px 4px", gap: 2, borderRight: i < 2 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: "0.7rem", color: "var(--gray)", textTransform: "uppercase", letterSpacing: 0.5 }}>{label}</span>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--gold-light)", fontWeight: 700 }}>{value}</span>
            </div>
          ))}
        </div>

        {/* XP bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.7rem", color: "var(--gray)", marginBottom: 4 }}>
            <span>Level {user?.level}</span>
            <span>{(user?.xp || 0).toLocaleString()} XP</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${Math.min(((user?.xp || 0) / (500 * Math.pow(2, (user?.level || 1) - 1))) * 100, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Early access banner */}
      {user?.is_early_access && (
        <div className="px-16" style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, background: "linear-gradient(135deg, rgba(201,168,76,0.1), rgba(201,168,76,0.05))", border: "1px solid var(--gold-dim)", borderRadius: "var(--radius)", padding: "10px 14px" }}>
            <span style={{ fontSize: "1.3rem" }}>🎖</span>
            <div>
              <div style={{ fontWeight: 700, color: "var(--gold)", fontSize: "0.85rem" }}>Early Access Member</div>
              <div style={{ fontSize: "0.72rem", color: "var(--gray-light)" }}>10% token allocation guaranteed</div>
            </div>
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="px-16" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
        {[
          { icon: "📋", label: "Earn", path: "/tasks" },
          { icon: "🏆", label: "Rank", path: "/leaderboard" },
          { icon: "🖼", label: "NFT", path: "/nft" },
          { icon: "👤", label: "Profile", path: "/profile" },
        ].map(item => (
          <button key={item.path} onClick={() => navigate(item.path)} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, cursor: "pointer" }}>
            <span style={{ fontSize: "1.3rem" }}>{item.icon}</span>
            <span style={{ fontSize: "0.68rem", color: "var(--gray-light)", fontWeight: 600 }}>{item.label}</span>
          </button>
        ))}
      </div>

      {/* Tables */}
      <div className="px-16">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <span style={{ fontFamily: "var(--font-display)", fontSize: "1rem", color: "var(--gold)" }}>🃏 Tables</span>
          <span style={{ fontSize: "0.8rem", color: "var(--gray)" }}>{tables.length} available</span>
        </div>

        {loading ? (
          <div style={{ color: "var(--gray)", textAlign: "center", paddingTop: 20 }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {tables.map(table => {
              const canAfford = userChipsForTable(table) >= table.min_buy_in;
              const isPremium = table.chips_type === "premium_chips";
              return (
                <div key={table.id} style={{ background: "var(--surface)", border: `1px solid ${isPremium ? "rgba(100,160,255,0.3)" : "var(--border)"}`, borderRadius: "var(--radius)", padding: 14, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: isPremium ? "radial-gradient(#0d0030, #060015)" : "radial-gradient(#1a5c2e, #0a2e14)", border: `2px solid ${isPremium ? "#9b59b6" : "#2d8a4a"}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.2rem", flexShrink: 0 }}>
                    {isPremium ? "💎" : "🃏"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 3 }}>{table.name}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {[chipsLabel(table), `${formatChips(table.small_blind)}/${formatChips(table.big_blind)}`, `Min ${formatChips(table.min_buy_in)}`].map(tag => (
                        <span key={tag} style={{ fontSize: "0.68rem", color: "var(--gray-light)", background: "var(--surface2)", padding: "2px 6px", borderRadius: 4 }}>{tag}</span>
                      ))}
                    </div>
                    <div style={{ fontSize: "0.72rem", color: "var(--gray)", marginTop: 3 }}>
                      <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#4a4", marginRight: 4 }} />
                      {table.live_players || 0}/{table.max_players} players
                    </div>
                  </div>
                  <button
                    onClick={canAfford ? () => openBuyIn(table) : undefined}
                    disabled={!canAfford}
                    style={{ padding: "8px 14px", borderRadius: 6, fontWeight: 700, fontSize: "0.8rem", cursor: canAfford ? "pointer" : "not-allowed", border: "none", background: canAfford ? "linear-gradient(135deg, var(--gold), #a07830)" : "var(--surface2)", color: canAfford ? "#0a0805" : "var(--gray)", fontFamily: "var(--font-body)" }}
                  >
                    {canAfford ? "Join" : "Low"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Buy-in Modal — FIXED: padding-bottom so button visible above navbar */}
      {buyInModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "flex-end", zIndex: 100, backdropFilter: "blur(4px)" }}
          onClick={() => setBuyInModal(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "20px 20px 0 0",
              padding: "24px 20px",
              paddingBottom: "calc(24px + var(--nav-height))", // ← KEY FIX: above navbar
              width: "100%",
              maxWidth: 430,
              margin: "0 auto",
            }}
          >
            <div style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem", color: "var(--gold)", marginBottom: 16, textAlign: "center" }}>
              {buyInModal.name}
            </div>

            <div style={{ background: "var(--surface2)", borderRadius: "var(--radius-sm)", padding: 12, marginBottom: 16 }}>
              {[["Blinds", `${formatChips(buyInModal.small_blind)} / ${formatChips(buyInModal.big_blind)}`], ["Type", buyInModal.chips_type === "premium_chips" ? "💎 Premium" : "🪙 Regular"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", padding: "4px 0", color: "var(--gray-light)" }}>
                  <span>{k}</span>
                  <span style={{ color: "var(--gold)" }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ fontSize: "0.85rem", color: "var(--gray-light)", marginBottom: 8 }}>Buy-in Amount</div>
            <input
              type="range"
              min={buyInModal.min_buy_in}
              max={Math.min(buyInModal.max_buy_in, userChipsForTable(buyInModal))}
              step={buyInModal.big_blind}
              value={buyInAmount}
              onChange={e => setBuyInAmount(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--gold)", marginBottom: 8 }}
            />
            <div style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "1.2rem", color: "var(--gold)", marginBottom: 16 }}>
              {formatChips(buyInAmount)} chips
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setBuyInModal(null)} style={{ flex: 1, padding: 12, background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--gray)", fontSize: "0.9rem", cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Cancel
              </button>
              <button onClick={joinTable} style={{ flex: 1, padding: 12, background: "linear-gradient(135deg, var(--gold), #a07830)", border: "none", borderRadius: 8, color: "#0a0805", fontSize: "0.9rem", fontWeight: 700, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Sit Down ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
