// pages.jsx — Complete Final Version

import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { TonConnectButton, useTonConnectUI, useTonAddress } from '@tonconnect/ui-react';
import { useLocation, useNavigate } from "react-router-dom";

export function Leaderboard() {
  const { api, user } = useStore();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api("/api/leaderboard").then(setData).finally(() => setLoading(false));
  }, []);

  const formatChips = (n) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n?.toLocaleString() || "0";
  };

  const medalEmoji = (rank) => {
    if (rank === 1) return "🥇";
    if (rank === 2) return "🥈";
    if (rank === 3) return "🥉";
    return `#${rank}`;
  };

  return (
    <div className="page">
      <div className="page-header px-16">
        <div className="page-title">🏆 Leaderboard</div>
        <div className="text-gray text-sm">Weekly ranking</div>
      </div>
      {loading ? (
        <div className="px-16 text-gray text-center" style={{ paddingTop: 40 }}>Loading...</div>
      ) : (
        <div className="px-16">
          {data.map((entry, i) => {
            const isMe = entry.telegram_id == user?.telegram_id;
            return (
              <div
                key={entry.id}
                style={{
                  background: isMe ? "rgba(201,168,76,0.08)" : "var(--surface)",
                  border: `1px solid ${isMe ? "var(--gold-dim)" : "var(--border)"}`,
                  borderRadius: "var(--radius)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginBottom: "8px",
                }}
              >
                <span style={{ width: 32, textAlign: "center", fontFamily: "var(--font-mono)", fontSize: "1rem", color: "var(--gold)" }}>
                  {medalEmoji(i + 1)}
                </span>
                <div className="avatar avatar-sm">
                  {(entry.first_name || entry.username || "?")?.[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
                    {entry.username || entry.first_name || "Player"}
                    {isMe && <span style={{ color: "var(--gold)", fontSize: "0.75rem", marginLeft: 4 }}>(you)</span>}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--gray-light)" }}>
                    Lv.{entry.level} · Win Rate {entry.win_rate}%
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: "var(--font-mono)", color: "var(--gold-light)", fontWeight: 700 }}>
                    {formatChips(entry.weekly_chips)}
                  </div>
                  <div style={{ fontSize: "0.7rem", color: "var(--gray)" }}>chips</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Profile() {
  const { api, user, showNotification } = useStore();
  const [referral, setReferral] = useState(null);
  const [profile, setProfile] = useState(null);
  const tonAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  useEffect(() => {
    api("/api/profile").then(setProfile);
    api("/api/referral").then(setReferral);
  }, []);

  useEffect(() => {
    if (tonAddress) {
      api('/api/profile/wallet', { method: 'POST', body: { wallet: tonAddress } }).catch(() => {});
    }
  }, [tonAddress]);

  function copyLink() {
    if (referral?.referralLink) {
      navigator.clipboard.writeText(referral.referralLink);
      showNotification("Referral link copied!", "success");
    }
  }

  const formatChips = (n) => n?.toLocaleString() || "0";

  return (
    <div className="page">
      <div className="page-header px-16">
        <div className="page-title">👤 Profile</div>
      </div>
      <div className="px-16">
        <div className="card card-gold" style={{ marginBottom: 16, textAlign: "center" }}>
          <div className="avatar avatar-lg" style={{ margin: "0 auto 12px" }}>
            {user?.photo_url
              ? <img src={user.photo_url} alt="" />
              : (user?.first_name || "P")?.[0]?.toUpperCase()}
          </div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700 }}>
            {user?.first_name} {user?.last_name}
          </div>
          {user?.username && <div className="text-gray text-sm">@{user.username}</div>}
          <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
            <span className="badge badge-gold">Lv.{user?.level}</span>
            {user?.is_early_access && <span className="badge badge-blue">Early Access</span>}
            {user?.is_influencer && <span className="badge badge-green">Influencer</span>}
          </div>
        </div>

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: "var(--gold)" }}>📊 Stats</div>
          {[
            ["Chips", `🪙 ${formatChips(user?.chips)}`],
            ["Premium Chips", `💎 ${formatChips(user?.premium_chips)}`],
            ["Total Hands", user?.total_hands?.toLocaleString() || "0"],
            ["Total Wins", user?.total_wins?.toLocaleString() || "0"],
            ["Win Rate", user?.total_hands > 0 ? `${((user.total_wins / user.total_hands) * 100).toFixed(1)}%` : "0%"],
            ["XP", `${(user?.xp || 0).toLocaleString()}`],
          ].map(([label, value]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid var(--border)", fontSize: "0.9rem" }}>
              <span className="text-gray">{label}</span>
              <span className="font-mono" style={{ color: "var(--gold-light)" }}>{value}</span>
            </div>
          ))}
        </div>

        {profile?.nextLevel && (
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8, color: "var(--gold)" }}>
              ⭐ Level {user?.level} → {user?.level + 1}
            </div>
            <div className="progress-bar" style={{ marginBottom: 6 }}>
              <div className="progress-fill" style={{ width: `${Math.min(((user?.xp || 0) / profile.nextLevel.xp_required) * 100, 100)}%` }} />
            </div>
            <div className="flex justify-between text-xs text-gray">
              <span>{(user?.xp || 0).toLocaleString()} XP</span>
              <span>{profile.nextLevel.xp_required.toLocaleString()} XP needed</span>
            </div>
            {profile.nextLevel.unlock_feature && (
              <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(201,168,76,0.1)", borderRadius: "var(--radius-sm)", fontSize: "0.8rem", color: "var(--gold)" }}>
                🔓 Next unlock: {profile.nextLevel.description}
              </div>
            )}
          </div>
        )}

        {referral && (
          <div className="card card-gold" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, color: "var(--gold)" }}>👥 Referral</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="text-gray text-sm">Total Referred</span>
              <span className="font-mono" style={{ color: "var(--gold-light)" }}>{referral.totalReferrals} people</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <span className="text-gray text-sm">Bonus Earned</span>
              <span className="font-mono" style={{ color: "var(--gold-light)" }}>{referral.totalEarnings?.toLocaleString()} chips</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
              <span className="text-gray text-sm">Your Rate</span>
              <span style={{ color: "#5dcc5d", fontWeight: 700 }}>{referral.bonusPercent}% lifetime</span>
            </div>
            {referral.totalReferrals < 50 && (
              <div style={{ fontSize: "0.75rem", color: "var(--gray)", marginBottom: 12 }}>
                Invite {50 - referral.totalReferrals} more + reach Lv.15 to become Influencer (5% rate)
              </div>
            )}
            <button className="btn btn-gold btn-full" onClick={copyLink}>📋 Copy Referral Link</button>
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, marginBottom: 12, color: "var(--gold)" }}>💎 TON Wallet</div>
          {tonAddress ? (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "#6ab4ff", wordBreak: "break-all", marginBottom: 10, padding: "8px 10px", background: "rgba(100,160,255,0.1)", borderRadius: "var(--radius-sm)" }}>
                ✅ {tonAddress.slice(0, 10)}...{tonAddress.slice(-8)}
              </div>
              <button className="btn btn-dark btn-full btn-sm" onClick={() => tonConnectUI.disconnect()}>
                Disconnect Wallet
              </button>
            </div>
          ) : (
            <div>
              
              <TonConnectButton style={{ width: "100%" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function NFTPage() {
  const { api, user, showNotification } = useStore();
  const [mintAmount, setMintAmount] = useState(100000);
  const [minting, setMinting] = useState(false);

  const canMint = user?.level >= 30;

  async function mintNFT() {
    if (!canMint || minting) return;
    setMinting(true);
    try {
      await api("/api/nft/mint", { method: "POST", body: { chipsAmount: mintAmount } });
      showNotification(`NFT minted! ${mintAmount.toLocaleString()} chips locked.`, "success");
    } catch (err) {
      showNotification(err.message || "Mint failed", "error");
    } finally {
      setMinting(false);
    }
  }

  const formatChips = (n) => {
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
    return n?.toLocaleString() || "0";
  };

  return (
    <div className="page">
      <div className="page-header px-16">
        <div className="page-title">🖼 NFT Marketplace</div>
        <div className="text-gray text-sm">Convert chips to NFT, sell on GetGems</div>
      </div>
      <div className="px-16">
        {!canMint && (
          <div className="card" style={{ marginBottom: 16, textAlign: "center", padding: "24px 16px" }}>
            <div style={{ fontSize: "2rem", marginBottom: 8 }}>🔒</div>
            <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 4 }}>Level 30 Required</div>
            <div className="text-gray text-sm">You're Level {user?.level}. Reach Level 30 to unlock NFT minting.</div>
            <div style={{ marginTop: 12 }}>
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${(user?.level / 30) * 100}%` }} />
              </div>
              <div className="text-xs text-gray" style={{ marginTop: 4 }}>{user?.level}/30 levels</div>
            </div>
          </div>
        )}

        {canMint && (
          <div className="card card-gold" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 12 }}>✨ Mint Chips NFT</div>
            <div className="text-gray text-sm" style={{ marginBottom: 12 }}>
              Convert your Premium Chips to NFT and list on GetGems. 20% royalty on every sale.
            </div>
            <div style={{ marginBottom: 8 }}>
              <div className="flex justify-between text-sm" style={{ marginBottom: 4 }}>
                <span className="text-gray">Amount</span>
                <span className="font-mono text-gold">{formatChips(mintAmount)} chips</span>
              </div>
              <input
                type="range"
                min={10000}
                max={user?.premium_chips || 0}
                step={10000}
                value={mintAmount}
                onChange={(e) => setMintAmount(Number(e.target.value))}
                style={{ width: "100%", accentColor: "var(--gold)" }}
              />
            </div>
            <div style={{ fontSize: "0.8rem", color: "var(--gray-light)", marginBottom: 12 }}>
              💎 Available: {formatChips(user?.premium_chips)} Premium Chips
            </div>
            <button
              className="btn btn-gold btn-full"
              onClick={mintNFT}
              disabled={minting || mintAmount > (user?.premium_chips || 0)}
            >
              {minting ? "Minting..." : "🎨 Mint NFT"}
            </button>
          </div>
        )}

        <div className="card" style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 12 }}>ℹ️ How It Works</div>
          {[
            ["1", "Reach Level 30", "Unlock NFT minting"],
            ["2", "Mint Chips NFT", "Lock your chips into an NFT"],
            ["3", "List on GetGems", "Set your own price in TON"],
            ["4", "Earn TON", "Buyer gets chips, you get TON. 20% royalty on every sale."],
          ].map(([num, title, desc]) => (
            <div key={num} style={{ display: "flex", gap: 12, marginBottom: 12 }}>
              <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--gold-dim)", color: "var(--gold)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: "0.8rem", flexShrink: 0 }}>
                {num}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{title}</div>
                <div className="text-gray text-sm">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        <a
          href={import.meta.env.VITE_GETGEMS_URL || "https://getgems.io"}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 24px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gold-dim)", color: "var(--gold)", fontWeight: 600, marginBottom: 16, textDecoration: "none" }}
        >
          🔗 View on GetGems
        </a>
      </div>
    </div>
  );
}

export function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  if (path.startsWith("/game/")) return null;

  const items = [
    { path: "/", label: "Tables", icon: "🃏" },
    { path: "/tasks", label: "Earn", icon: "📋" },
    { path: "/leaderboard", label: "Rank", icon: "🏆" },
    { path: "/nft", label: "NFT", icon: "🖼" },
    { path: "/profile", label: "Profile", icon: "👤" },
  ];

  return (
    <nav className="bottom-nav">
      {items.map((item) => {
        const active = path === item.path;
        return (
          <button
            key={item.path}
            className={`nav-item ${active ? "active" : ""}`}
            onClick={() => navigate(item.path)}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        );
      })}
      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 430px;
          height: var(--nav-height);
          background: var(--dark);
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          z-index: 100;
          padding: 0 8px;
        }
        .nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 8px 4px;
          border-radius: var(--radius-sm);
          transition: all 0.2s;
        }
        .nav-item.active .nav-icon { filter: drop-shadow(0 0 6px rgba(201,168,76,0.8)); }
        .nav-icon { font-size: 1.3rem; }
        .nav-label {
          font-size: 0.65rem;
          color: var(--gray);
          font-weight: 600;
          letter-spacing: 0.3px;
          font-family: var(--font-body);
        }
        .nav-item.active .nav-label { color: var(--gold); }
      `}</style>
    </nav>
  );
}

export function LoadingScreen() {
  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "var(--black)", gap: 16 }}>
      <div style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", color: "var(--gold)", textShadow: "0 0 30px rgba(201,168,76,0.6)", animation: "pulse 2s infinite" }}>
        ♠ ROYAL POKER
      </div>
      <div style={{ width: 40, height: 40, border: "3px solid var(--gold-dim)", borderTopColor: "var(--gold)", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}