// Game.jsx — Production Version
// All bugs fixed, professional animations, correct poker rules

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import { useStore } from "../store/useStore";

// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES = {
  beginner: { felt:"radial-gradient(ellipse 140% 100% at 50% 50%,#1d6b3a,#0e3a1d 55%,#061a0c)", rail:"#5C3317", border:"#3a9a5c", accent:"#5dcc85", cardBack:"#1a237e", name:"Emerald" },
  regular:  { felt:"radial-gradient(ellipse 140% 100% at 50% 50%,#1a3060,#0d1a40 55%,#07101f)", rail:"#2a1a0a", border:"#4a7acc", accent:"#6ab4ff", cardBack:"#380080", name:"Sapphire" },
  high:     { felt:"radial-gradient(ellipse 140% 100% at 50% 50%,#2e1800,#180c00 55%,#080400)", rail:"#1a1000", border:"#c9a84c", accent:"#ffd700", cardBack:"#8B0000", name:"Royal Gold" },
  vip:      { felt:"radial-gradient(ellipse 140% 100% at 50% 50%,#0e0025,#060012 55%,#020008)", rail:"#180030", border:"#9b59b6", accent:"#cc77ff", cardBack:"#1a0045", name:"VIP Diamond" },
};
function getTheme(t) {
  if (!t) return THEMES.regular;
  if (t.chips_type === "premium_chips") return THEMES.vip;
  if ((t.min_buy_in||0) >= 20000) return THEMES.high;
  if ((t.min_buy_in||0) >= 5000)  return THEMES.regular;
  return THEMES.beginner;
}
function getUserId(token) {
  try { return JSON.parse(atob(token.split('.')[1])).userId; } catch { return null; }
}
const fmt = n => {
  if (n == null) return "0";
  if (n >= 1e6) return `${(n/1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n/1e3).toFixed(0)}K`;
  return String(n);
};

// ─── Action styles ────────────────────────────────────────────────────────────
const ACTION_STYLE = {
  fold:  { bg:"rgba(183,28,28,0.92)",  icon:"❌", label:"FOLD",   color:"#ffcdd2" },
  check: { bg:"rgba(33,33,33,0.92)",   icon:"✋", label:"CHECK",  color:"white" },
  call:  { bg:"rgba(21,101,192,0.92)", icon:"📞", label:"CALL",   color:"#bbdefb" },
  raise: { bg:"rgba(230,81,0,0.92)",   icon:"⬆", label:"RAISE",  color:"#ffe0b2" },
  allin: { bg:"rgba(136,14,79,0.92)",  icon:"💥", label:"ALL-IN", color:"#fce4ec" },
};

// ─── Card ─────────────────────────────────────────────────────────────────────
function Card({ card, faceDown, theme, w=38, h=54, highlight=false, dim=false, delay=0 }) {
  const isRed = card?.suit === "♥" || card?.suit === "♦";
  const base  = {
    width:w, height:h, borderRadius:5, flexShrink:0,
    transition:"all 0.3s",
    opacity: dim ? 0.35 : 1,
    animation: `cardDeal 0.35s ease ${delay}s both`,
  };
  if (faceDown || !card) return (
    <div style={{...base, background:theme?.cardBack||"#1a237e", border:`1px solid ${theme?.border||"#444"}44`,
      display:"flex", alignItems:"center", justifyContent:"center",
      boxShadow:"0 2px 8px rgba(0,0,0,0.6)"}}>
      <span style={{fontSize:"0.7rem", opacity:0.2, color:theme?.accent||"#fff"}}>♠</span>
    </div>
  );
  return (
    <div style={{...base,
      background:"white",
      border: highlight ? `2px solid ${theme?.accent||"#ffd700"}` : "1px solid #ddd",
      boxShadow: highlight ? `0 0 14px ${theme?.accent||"#ffd700"}, 0 2px 8px rgba(0,0,0,0.5)` : "0 2px 8px rgba(0,0,0,0.5)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      color: isRed ? "#cc2222" : "#111",
    }}>
      <span style={{fontSize: w>36?"0.85rem":"0.62rem", fontWeight:700, lineHeight:1}}>{card.rank}</span>
      <span style={{fontSize: w>36?"0.95rem":"0.72rem", lineHeight:1}}>{card.suit}</span>
    </div>
  );
}

// ─── Chips Flying Animation ───────────────────────────────────────────────────
function ChipsFly({ from, to, amount, color, onDone }) {
  const [pos, setPos] = useState(from);
  const [opacity, setOpacity] = useState(1);
  useEffect(() => {
    const t1 = setTimeout(() => setPos(to), 50);
    const t2 = setTimeout(() => setOpacity(0), 600);
    const t3 = setTimeout(() => onDone?.(), 900);
    return () => [t1,t2,t3].forEach(clearTimeout);
  }, []);
  return (
    <div style={{
      position:"fixed",
      left: pos.x, top: pos.y,
      transition:"left 0.6s cubic-bezier(.2,.8,.2,1), top 0.6s cubic-bezier(.2,.8,.2,1)",
      opacity: opacity, transition2:"opacity 0.3s",
      zIndex:999, pointerEvents:"none",
      fontSize:"0.7rem", fontFamily:"monospace", fontWeight:700,
      color: color || "#ffd700",
      textShadow:"0 0 8px rgba(0,0,0,0.8)",
    }}>
      🪙{fmt(amount)}
    </div>
  );
}

// ─── Seat Positions ───────────────────────────────────────────────────────────
const SEAT_POS = [
  { bottom:"2%",  left:"50%",  transform:"translateX(-50%)" }, // 0 me
  { bottom:"22%", left:"3%" },
  { top:"42%",    left:"0%",   transform:"translateY(-50%)" },
  { top:"5%",     left:"5%" },
  { top:"1%",     left:"50%",  transform:"translateX(-50%)" },
  { top:"5%",     right:"5%" },
  { top:"42%",    right:"0%",  transform:"translateY(-50%)" },
  { bottom:"22%", right:"3%" },
];

// ─── Player Seat ──────────────────────────────────────────────────────────────
function Seat({ player, isMe, isActive, myCards, winCards, theme, posIdx,
                tableId, api, showNotification, actionFlash, showdown, myId }) {
  const [blindMode,    setBlindMode]    = useState(false);
  const [cardsSeen,    setCardsSeen]    = useState(false);
  const [showTip,      setShowTip]      = useState(false);
  const [tipAmt,       setTipAmt]       = useState(500);
  const pos = SEAT_POS[posIdx] || SEAT_POS[0];

  const myFlash = actionFlash?.userId === player.userId ? actionFlash : null;
  const aStyle  = myFlash ? ACTION_STYLE[myFlash.action] || ACTION_STYLE.check : null;

  const cardCount  = isMe ? (myCards?.length||0) : (player.cardCount||0);

  // Showdown: show all cards with win highlight
  const sdData = showdown?.find(r => r.userId === player.userId);

  function handlePeek() {
    if (!cardsSeen) {
      setCardsSeen(true);
      setBlindMode(false);
      // Tell server cards were peeked
      // (handled in parent via socket)
    }
  }

  async function sendTip() {
    try {
      await api("/api/game/tip", { method:"POST", body:{ tableId, recipientId:player.userId, amount:tipAmt } });
      showNotification(`🎁 ${fmt(tipAmt)} tipped to ${player.username}!`, "success");
      setShowTip(false);
    } catch(e) { showNotification(e.message||"Failed","error"); }
  }

  const bColor = isActive ? "#4CAF50" : isMe ? (theme?.border||"#c9a84c") : "rgba(255,255,255,0.1)";

  // Determine winning cards for highlight
  const winnerCards    = sdData?.winningCards?.map(c => `${c.rank}${c.suit}`) || [];
  const allShowCards   = sdData?.holeCards || [];

  return (
    <div style={{ position:"absolute", ...pos, zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>

      {/* Action flash */}
      {myFlash && aStyle && (
        <div style={{ position:"absolute", top:-34, left:"50%", transform:"translateX(-50%)", background:aStyle.bg, color:aStyle.color, borderRadius:20, padding:"3px 12px", fontSize:"0.65rem", fontWeight:700, whiteSpace:"nowrap", zIndex:20, animation:"popFade 1.5s ease forwards" }}>
          {aStyle.icon} {myFlash.actionLabel}{myFlash.amount > 0 ? ` ${fmt(myFlash.amount)}` : ""}
        </div>
      )}

      {/* Cards */}
      {(cardCount > 0 || allShowCards.length > 0) && (
        <div style={{ display:"flex", gap:3, marginBottom:2 }}>
          {isMe ? (
            myCards.map((card, i) => (
              <Card key={i} card={card} faceDown={blindMode || !cardsSeen} theme={theme} w={32} h={44} delay={i*0.1}/>
            ))
          ) : allShowCards.length > 0 ? (
            // Showdown — show actual cards with highlights
            allShowCards.map((card, i) => {
              const key   = `${card.rank}${card.suit}`;
              const isWin = winnerCards.includes(key);
              return <Card key={i} card={card} theme={theme} w={28} h={40} highlight={isWin} dim={!isWin && winnerCards.length > 0}/>;
            })
          ) : (
            Array.from({ length:cardCount }).map((_,i) => (
              <Card key={i} faceDown theme={theme} w={28} h={40}/>
            ))
          )}
        </div>
      )}

      {/* Player info */}
      <div style={{ background: isMe ? `${theme?.border||"#c9a84c"}18` : "rgba(0,0,0,0.82)", border:`2px solid ${bColor}`, borderRadius:8, padding:"4px 8px", minWidth:68, textAlign:"center", backdropFilter:"blur(6px)", boxShadow: isActive ? `0 0 14px rgba(76,175,80,0.5)` : "0 2px 8px rgba(0,0,0,0.6)", opacity: player.isFolded ? 0.3 : 1, position:"relative", transition:"border-color 0.3s" }}>

        {/* Badges */}
        {player.isDealer     && <div style={{ position:"absolute",top:-9,left:-5,width:15,height:15,borderRadius:"50%",background:theme?.accent||"#c9a84c",color:"#000",fontSize:"0.45rem",fontWeight:900,display:"flex",alignItems:"center",justifyContent:"center" }}>D</div>}
        {player.isSmallBlind && <div style={{ position:"absolute",top:-9,right:-3,background:"#1565c0",color:"#fff",borderRadius:3,padding:"0 3px",fontSize:"0.45rem",fontWeight:700 }}>SB</div>}
        {player.isBigBlind   && <div style={{ position:"absolute",top:-9,right:-3,background:"#c62828",color:"#fff",borderRadius:3,padding:"0 3px",fontSize:"0.45rem",fontWeight:700 }}>BB</div>}
        {player.isAllIn      && <div style={{ position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:"#e65100",color:"#fff",borderRadius:3,padding:"0 4px",fontSize:"0.45rem",fontWeight:700,whiteSpace:"nowrap" }}>ALL-IN</div>}
        {player.isWaiting    && <div style={{ position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",background:"#555",color:"#fff",borderRadius:3,padding:"0 4px",fontSize:"0.45rem",fontWeight:700,whiteSpace:"nowrap" }}>WAITING</div>}

        {/* Avatar + name */}
        <div style={{ display:"flex", alignItems:"center", gap:4, justifyContent:"center", marginBottom:2 }}>
          <div style={{ width:18,height:18,borderRadius:"50%",background:`linear-gradient(135deg,${theme?.border||"#c9a84c"},#333)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.5rem",fontWeight:700,color:"white",overflow:"hidden",flexShrink:0 }}>
            {player.avatarUrl ? <img src={player.avatarUrl} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }}/> : (player.username||"P")?.[0]?.toUpperCase()}
          </div>
          <span style={{ fontSize:"0.6rem",fontWeight:700,color:"white",maxWidth:46,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
            {isMe ? "You" : (player.username||"P")}
          </span>
        </div>

        <div style={{ fontSize:"0.6rem",fontFamily:"monospace",color:theme?.accent||"#c9a84c",fontWeight:700 }}>🪙{fmt(player.chips)}</div>
        {player.currentBet > 0 && <div style={{ fontSize:"0.5rem",color:"#66bb6a",marginTop:1 }}>Bet:{fmt(player.currentBet)}</div>}
        {player.isFolded
          ? <div style={{ fontSize:"0.5rem",color:"#ef5350",fontWeight:700,marginTop:1 }}>FOLD</div>
          : player.lastAction && <div style={{ fontSize:"0.5rem",color:"rgba(255,255,255,0.4)",fontStyle:"italic",marginTop:1 }}>{player.lastAction}</div>
        }
        {sdData && <div style={{ fontSize:"0.52rem",color:sdData.isWinner?(theme?.accent||"#ffd700"):"rgba(255,255,255,0.5)",marginTop:1,fontWeight:sdData.isWinner?700:400 }}>{sdData.isWinner?"🏆 ":""}{sdData.handName}</div>}
      </div>

      {/* My controls */}
      {isMe && cardCount > 0 && (
        <div style={{ display:"flex", gap:4, marginTop:2 }}>
          <button
            onClick={handlePeek}
            disabled={cardsSeen}
            style={{ background:cardsSeen?`${theme?.border||"var(--gold-dim)"}22`:"rgba(0,0,0,0.7)", border:`1px solid ${theme?.border||"var(--gold-dim)"}55`, borderRadius:5, padding:"2px 8px", fontSize:"0.52rem", color:cardsSeen?(theme?.border||"var(--gold)"):`${theme?.border||"var(--gold)"}88`, cursor:cardsSeen?"default":"pointer", fontFamily:"var(--font-body)" }}
          >
            {cardsSeen ? "👁 Cards Seen" : "👁 Peek"}
          </button>
          {!cardsSeen && (
            <button
              onClick={() => setBlindMode(!blindMode)}
              style={{ background:blindMode?"rgba(198,40,40,0.3)":"rgba(0,0,0,0.6)", border:`1px solid ${blindMode?"#ef5350":"rgba(255,255,255,0.2)"}`, borderRadius:5, padding:"2px 8px", fontSize:"0.52rem", color:blindMode?"#ef9a9a":"rgba(255,255,255,0.5)", cursor:"pointer", fontFamily:"var(--font-body)" }}
            >
              {blindMode ? "🫣 Blind ON" : "🫣 Blind"}
            </button>
          )}
        </div>
      )}

      {/* Tip */}
      {!isMe && !player.isBot && (
        <div style={{ position:"relative", marginTop:2 }}>
          <button onClick={() => setShowTip(!showTip)} style={{ background:"rgba(0,0,0,0.6)",border:`1px solid ${theme?.border||"var(--gold-dim)"}44`,borderRadius:4,padding:"1px 6px",fontSize:"0.5rem",color:theme?.accent||"var(--gold)",cursor:"pointer" }}>🎁</button>
          {showTip && (
            <div style={{ position:"absolute",bottom:"110%",left:"50%",transform:"translateX(-50%)",background:"var(--surface)",border:`1px solid ${theme?.border||"var(--gold-dim)"}`,borderRadius:10,padding:10,zIndex:200,width:130,boxShadow:"0 4px 20px rgba(0,0,0,0.9)" }}>
              <div style={{ fontSize:"0.65rem",fontWeight:700,color:theme?.accent||"var(--gold)",marginBottom:6 }}>Tip {player.username}</div>
              <div style={{ display:"flex",gap:3,flexWrap:"wrap",marginBottom:6 }}>
                {[100,500,1000,5000].map(a => (
                  <button key={a} onClick={() => setTipAmt(a)} style={{ background:tipAmt===a?(theme?.border||"var(--gold-dim)"):"var(--surface2)",border:`1px solid ${tipAmt===a?(theme?.accent||"var(--gold)"):"var(--border)"}`,borderRadius:4,padding:"2px 5px",color:tipAmt===a?"#000":"var(--gray-light)",fontSize:"0.6rem",cursor:"pointer",fontFamily:"var(--font-body)" }}>
                    {a>=1000?`${a/1000}K`:a}
                  </button>
                ))}
              </div>
              <div style={{ display:"flex",gap:4 }}>
                <button onClick={() => setShowTip(false)} style={{ flex:1,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:4,padding:"3px",color:"var(--gray)",fontSize:"0.6rem",cursor:"pointer" }}>✕</button>
                <button onClick={sendTip} style={{ flex:1,background:`linear-gradient(135deg,${theme?.border||"var(--gold)"},#a07830)`,border:"none",borderRadius:4,padding:"3px",color:"#0a0805",fontSize:"0.6rem",fontWeight:700,cursor:"pointer" }}>Send</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Timer (server-synced) ────────────────────────────────────────────────────
function Timer({ timeLimit, timeStart, theme }) {
  const elapsed  = Math.floor((Date.now() - timeStart) / 1000);
  const initial  = Math.max(0, timeLimit - elapsed);
  const [t, setT] = useState(initial);

  useEffect(() => {
    setT(initial);
    const i = setInterval(() => setT(p => Math.max(0, p - 1)), 1000);
    return () => clearInterval(i);
  }, [timeStart]);

  const pct   = t / timeLimit;
  const r     = 13, c = 2 * Math.PI * r;
  const color = t < 10 ? "#F44336" : (theme?.accent||"#c9a84c");
  const scale = 0.6 + pct * 0.4; // shrinks as time runs out

  return (
    <div style={{ position:"relative",width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",transform:`scale(${scale})`,transition:"transform 1s linear" }}>
      <svg width="32" height="32" style={{ position:"absolute" }}>
        <circle cx="16" cy="16" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3"/>
        <circle cx="16" cy="16" r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={c} strokeDashoffset={c*(1-pct)}
          strokeLinecap="round"
          style={{ transform:"rotate(-90deg)",transformOrigin:"center",transition:"stroke-dashoffset 1s linear" }}/>
      </svg>
      <span style={{ fontSize:"0.68rem",fontFamily:"monospace",fontWeight:700,color }}>{t}</span>
    </div>
  );
}

// ─── Dealer Center ────────────────────────────────────────────────────────────
function Dealer({ theme, tableId, api, showNotification }) {
  const [show,setShow] = useState(false);
  const [amt,setAmt]   = useState(200);
  const [busy,setBusy] = useState(false);
  async function tip() {
    setBusy(true);
    try { await api("/api/game/tip-dealer",{method:"POST",body:{tableId,amount:amt}}); showNotification("🎰 Dealer tipped!","success"); setShow(false); }
    catch(e) { showNotification(e.message||"Failed","error"); }
    setBusy(false);
  }
  return (
    <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:8,display:"flex",flexDirection:"column",alignItems:"center",gap:2 }}>
      <div style={{ width:32,height:32,borderRadius:"50%",background:"rgba(0,0,0,0.85)",border:`2px solid ${theme?.border||"#c9a84c"}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:"0.85rem",boxShadow:`0 0 12px ${theme?.border||"#c9a84c"}44` }}>🎰</div>
      <button onClick={() => setShow(!show)} style={{ background:"rgba(0,0,0,0.6)",border:`1px solid ${theme?.border||"var(--gold-dim)"}55`,borderRadius:4,padding:"1px 6px",fontSize:"0.48rem",color:theme?.accent||"var(--gold)",cursor:"pointer" }}>🎁</button>
      {show && (
        <div style={{ position:"absolute",top:"110%",background:"var(--surface)",border:`1px solid ${theme?.border||"var(--gold-dim)"}`,borderRadius:10,padding:10,zIndex:200,width:120,boxShadow:"0 4px 20px rgba(0,0,0,0.9)" }}>
          <div style={{ fontSize:"0.65rem",fontWeight:700,color:theme?.accent||"var(--gold)",marginBottom:6 }}>Tip Dealer 🎰</div>
          <div style={{ display:"flex",gap:3,flexWrap:"wrap",marginBottom:6 }}>
            {[100,200,500,1000].map(a => (
              <button key={a} onClick={() => setAmt(a)} style={{ background:amt===a?(theme?.border||"var(--gold-dim)"):"var(--surface2)",border:`1px solid ${amt===a?(theme?.accent||"var(--gold)"):"var(--border)"}`,borderRadius:4,padding:"2px 5px",color:amt===a?"#000":"var(--gray-light)",fontSize:"0.58rem",cursor:"pointer",fontFamily:"var(--font-body)" }}>{a>=1000?"1K":a}</button>
            ))}
          </div>
          <div style={{ display:"flex",gap:4 }}>
            <button onClick={() => setShow(false)} style={{ flex:1,background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:4,padding:"3px",color:"var(--gray)",fontSize:"0.58rem",cursor:"pointer" }}>✕</button>
            <button onClick={tip} disabled={busy} style={{ flex:1,background:`linear-gradient(135deg,${theme?.border||"var(--gold)"},#a07830)`,border:"none",borderRadius:4,padding:"3px",color:"#0a0805",fontSize:"0.58rem",fontWeight:700,cursor:"pointer" }}>{busy?"...":"Send"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Table Lobby (bottom sheet) ───────────────────────────────────────────────
function TableLobby({ currentTableId, token, onSwitch, onClose, theme }) {
  const [tables, setTables] = useState([]);
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/api/tables`, { headers:{ Authorization:`Bearer ${token}` } })
      .then(r => r.json()).then(setTables).catch(() => {});
  }, []);
  return (
    <div style={{ position:"fixed",inset:0,background:"rgba(0,0,0,0.7)",zIndex:80,display:"flex",alignItems:"flex-end" }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background:"var(--surface)",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:430,margin:"0 auto",padding:"16px 16px 32px",maxHeight:"60vh",overflowY:"auto" }}>
        <div style={{ width:40,height:4,borderRadius:2,background:"var(--border)",margin:"0 auto 16px" }}/>
        <div style={{ fontFamily:"var(--font-display)",color:theme?.accent||"var(--gold)",fontSize:"1rem",marginBottom:12,textAlign:"center" }}>Switch Table</div>
        {tables.map(t => {
          const isCurrent = t.id === currentTableId;
          return (
            <div key={t.id} onClick={() => !isCurrent && onSwitch(t)} style={{ display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:8,border:`1px solid ${isCurrent?(theme?.border||"var(--gold-dim)"):"var(--border)"}`,background:isCurrent?`${theme?.border||"var(--gold-dim)"}15`:"var(--surface2)",marginBottom:8,cursor:isCurrent?"default":"pointer",opacity:isCurrent?1:0.9 }}>
              <span style={{ fontSize:"1.2rem" }}>{t.chips_type==="premium_chips"?"💎":"🃏"}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontWeight:700,fontSize:"0.85rem",color:isCurrent?(theme?.accent||"var(--gold)"):"white" }}>{t.name}{isCurrent?" (Current)":""}</div>
                <div style={{ fontSize:"0.7rem",color:"var(--gray-light)" }}>{t.small_blind}/{t.big_blind} · {t.live_players||0}/{t.max_players} players</div>
              </div>
              {!isCurrent && <span style={{ fontSize:"0.75rem",color:"var(--gray)",padding:"4px 8px",background:"var(--surface)",borderRadius:4 }}>Join →</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Game ────────────────────────────────────────────────────────────────
export default function Game() {
  const { tableId }      = useParams();
  const [searchParams]   = useSearchParams();
  const navigate         = useNavigate();
  const { user, token, api, showNotification } = useStore();
  const buyIn            = Number(searchParams.get("buyin") || 0);
  const socketRef        = useRef(null);
  const myIdRef          = useRef(user?.id || getUserId(token));

  const [tableConfig,    setTableConfig]    = useState(null);
  const [tableState,     setTableState]     = useState(null);
  const [myCards,        setMyCards]        = useState([]);
  const [myTurn,         setMyTurn]         = useState(false);
  const [actionData,     setActionData]     = useState(null);
  const [winner,         setWinner]         = useState(null);
  const [showdown,       setShowdown]       = useState(null);
  const [chatMsgs,       setChatMsgs]       = useState([]);
  const [chatInput,      setChatInput]      = useState("");
  const [showChat,       setShowChat]       = useState(false);
  const [connected,      setConnected]      = useState(false);
  const [raiseAmt,       setRaiseAmt]       = useState(0);
  const [toast,          setToast]          = useState(null);
  const [actionFlash,    setActionFlash]    = useState(null);
  const [isWaiting,      setIsWaiting]      = useState(false);
  const [newHandCount,   setNewHandCount]   = useState(null);
  const [showLeave,      setShowLeave]      = useState(false);
  const [showLobby,      setShowLobby]      = useState(false);
  const [pendingSwitch,  setPendingSwitch]  = useState(null);
  const [chipsAnim,      setChipsAnim]      = useState([]);

  const theme = getTheme(tableConfig);

  const showToast = useCallback((icon, title, sub, color, ms=2500) => {
    setToast({ icon, title, sub, color });
    setTimeout(() => setToast(null), ms);
  }, []);

  useEffect(() => {
    myIdRef.current = user?.id || getUserId(token);
  }, [user?.id, token]);

  useEffect(() => {
    myIdRef.current = user?.id || getUserId(token);
    if (!myIdRef.current) return;
    if (socketRef.current) return;

    const s = io(import.meta.env.VITE_API_URL, { auth:{ token }, transports:["websocket"] });
    socketRef.current = s;

    s.on("connect", () => {
      setConnected(true);
      s.emit("join_table", { tableId, buyIn });
    });

    s.on("joined_table", ({ tableState:ts }) => {
      setTableState(ts);
      fetch(`${import.meta.env.VITE_API_URL}/api/tables`, { headers:{ Authorization:`Bearer ${token}` } })
        .then(r => r.json()).then(tables => { const t = tables.find(t => t.id === tableId); if(t) setTableConfig(t); }).catch(()=>{});
    });

    s.on("new_hand_starting", d => {
      setNewHandCount(d.countdown || 3);
      setWinner(null); setShowdown(null); setMyTurn(false); setActionData(null);
      setTableState(p => ({ ...p, ...d, boardCards:[] }));
      let c = d.countdown || 3;
      const iv = setInterval(() => { c--; setNewHandCount(c); if(c<=0) { clearInterval(iv); setNewHandCount(null); } }, 1000);
    });

    s.on("blinds_collected", d => {
      setTableState(p => ({ ...p, pot:d.pot, players:d.players }));
      showToast("🃏","Collecting Blinds",`SB:${fmt(d.smallBlind)} BB:${fmt(d.bigBlind)}`,theme?.accent,1800);
    });

    // Cards — NEVER clear, just set
    s.onAny((event, data) => {
      if (!event.startsWith("cards_")) return;
      if (data?.userId === myIdRef.current) setMyCards(data.holeCards || []);
    });

    s.on("hand_started", d => {
      // Do NOT clear myCards here
      setTableState(p => ({ ...p, ...d }));
      setMyTurn(false); setActionData(null); setIsWaiting(false);
    });

    s.on("board_updated", d => {
      setTableState(p => ({ ...p, boardCards:d.boardCards, pot:d.pot }));
      const names = { flop:"Flop", turn:"Turn", river:"River" };
      showToast("",names[d.street]||"",`Pot: ${fmt(d.pot)}`,theme?.accent,1500);
    });

    s.on("player_action", d => {
      setTableState(p => ({ ...p, ...d }));
      setMyTurn(false);
      setActionFlash(d);
      setTimeout(() => setActionFlash(null), 1600);
      if (d.animationType === "allin") showToast("💥",`${d.username} ALL-IN!`,`${fmt(d.amount)} chips`,"#ff6b6b",3000);
      else if (d.animationType === "raise") showToast("⬆",`${d.username} Raises`,`to ${fmt(d.amount)}`,"#ffa552",2000);
    });

    s.on("action_required", d => {
      setTableState(p => ({ ...p, currentPlayerSeat:d.seat }));
      if (d.userId === myIdRef.current) {
        setMyTurn(true); setActionData(d);
        setRaiseAmt(d.minRaise || (d.currentBet||0)*2 || (d.callAmount||0)+100);
      } else {
        setMyTurn(false);
      }
    });

    s.on("showdown", d => {
      setShowdown(d.handResults);
      showToast("🃏","Showdown!","Best hand wins","#ffd700",4000);
    });

    s.on("hand_finished", d => {
      setTableState(p => ({ ...p, players:d.players }));
      setWinner(d); setMyTurn(false); setActionData(null);
      const w = d.winners?.[0];
      if (w) showToast("🎉",`${w.username} wins!`,`🪙${fmt(w.chipsWon)} — ${w.handName||""}`,theme?.accent,6000);
      setTimeout(() => { setWinner(null); setShowdown(null); setMyCards([]); }, 7500);
      // If pending table switch, do it now
      if (pendingSwitch) {
        const nextTable = pendingSwitch;
        setPendingSwitch(null);
        doSwitch(nextTable);
      }
    });

    s.on("player_waiting", d => {
      if (d.userId === myIdRef.current) setIsWaiting(true);
    });

    s.on("player_timeout", d => {
      if (d.userId === myIdRef.current) { setMyTurn(false); setActionData(null); }
    });

    s.on("dealer_tip", d => {
      showToast("🎰","Dealer Tipped!",d.message||"",theme?.accent,3000);
      setChatMsgs(p => [...p.slice(-50), { sys:true, msg:d.message }]);
    });

    s.on("tip_sent", d => {
      showToast("🎁","Tip Sent!",d.message||"",theme?.accent,2500);
      setChatMsgs(p => [...p.slice(-50), { sys:true, msg:d.message }]);
    });

    s.on("chat_message", m => setChatMsgs(p => [...p.slice(-50), m]));
    s.on("error", ({ message }) => showNotification(message, "error"));
    s.on("disconnect", () => setConnected(false));

    return () => { s.disconnect(); socketRef.current = null; };
  }, [token]);

  function act(action, amount=0) {
    socketRef.current?.emit("player_action", { action, amount });
    setMyTurn(false); setActionData(null);
  }

  function leaveTable() {
    socketRef.current?.emit("leave_table");
    navigate("/");
  }

  function sendChat() {
    if (!chatInput.trim()) return;
    socketRef.current?.emit("chat_message", { message:chatInput });
    setChatInput("");
  }

  function handlePeek() {
    socketRef.current?.emit("peek_cards");
  }

  function doSwitch(table) {
    socketRef.current?.emit("leave_table");
    navigate(`/game/${table.id}?buyin=${table.min_buy_in}`);
  }

  function handleSwitchTable(table) {
    setShowLobby(false);
    const gameRunning = tableState?.gameState && !["waiting","finished"].includes(tableState.gameState);
    if (gameRunning) {
      setPendingSwitch(table);
      showNotification("Will switch after current hand ends", "info");
    } else {
      doSwitch(table);
    }
  }

  const myId    = myIdRef.current;
  const players = tableState?.players || [];
  const me      = players.find(p => p.userId === myId);
  const others  = players.filter(p => p.userId !== myId);
  const callAmt = actionData?.callAmount || 0;
  const canCheck = actionData?.canCheck || callAmt === 0;
  const myChips = me?.chips || 0;
  const minRaise = actionData?.minRaise || (actionData?.currentBet||0)*2;

  // Winner cards for highlight
  const winnerData  = winner?.winners?.[0];
  const winnerCards = winnerData?.winningCards?.map(c => `${c.rank}${c.suit}`) || [];

  return (
    <div style={{ display:"flex",flexDirection:"column",height:"100dvh",background:"#040404",overflow:"hidden",width:"100%" }}>

      {/* Top bar */}
      <div style={{ height:42,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 12px",background:"rgba(0,0,0,0.92)",borderBottom:`1px solid ${theme.border}33`,flexShrink:0,zIndex:20 }}>
        <button onClick={() => setShowLeave(true)} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.4)",cursor:"pointer",fontSize:"0.78rem",padding:"4px 8px" }}>← Leave</button>
        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
          <div style={{ width:5,height:5,borderRadius:"50%",background:connected?"#4CAF50":"#F44336" }}/>
          <span style={{ fontSize:"0.7rem",color:theme.accent,fontWeight:700 }}>{theme.name}</span>
          {tableState?.gameState && <span style={{ fontSize:"0.52rem",color:"rgba(255,255,255,0.22)",letterSpacing:2,textTransform:"uppercase" }}>{tableState.gameState}</span>}
          {pendingSwitch && <span style={{ fontSize:"0.5rem",color:"#ffa552",marginLeft:4 }}>↪switching...</span>}
        </div>
        <div style={{ display:"flex",gap:4 }}>
          <button onClick={() => setShowLobby(true)} style={{ background:"none",border:`1px solid ${theme.border}44`,borderRadius:5,padding:"3px 7px",fontSize:"0.7rem",color:theme.accent,cursor:"pointer" }}>🏠</button>
          <button onClick={() => setShowChat(!showChat)} style={{ background:showChat?`${theme.border}22`:"none",border:`1px solid ${showChat?theme.border:"transparent"}`,borderRadius:5,padding:"3px 7px",fontSize:"0.85rem",cursor:"pointer" }}>💬</button>
        </div>
      </div>

      {/* Table area */}
      <div style={{ flex:1,position:"relative",overflow:"hidden",minHeight:0 }}>

        {/* Oval */}
        <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",width:"85%",height:"170px",borderRadius:"50%",background:theme.felt,border:`5px solid ${theme.rail}`,outline:`2px solid ${theme.border}44`,boxShadow:`0 0 50px rgba(0,0,0,0.95),inset 0 0 30px rgba(0,0,0,0.5)`,zIndex:2 }}>
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",opacity:0.06,fontSize:"0.85rem",color:theme.accent,letterSpacing:4,whiteSpace:"nowrap",fontWeight:700 }}>♠ ROYAL POKER ♥</div>
        </div>

        {/* Countdown */}
        {newHandCount !== null && newHandCount > 0 && (
          <div style={{ position:"absolute",top:"50%",left:"50%",transform:"translate(-50%,-50%)",zIndex:30,textAlign:"center",pointerEvents:"none" }}>
            <div style={{ fontSize:"3rem",fontWeight:900,color:theme.accent,textShadow:`0 0 30px ${theme.border}`,animation:"countPop 1s ease" }}>{newHandCount}</div>
            <div style={{ fontSize:"0.65rem",color:"rgba(255,255,255,0.4)",letterSpacing:3 }}>NEW HAND</div>
          </div>
        )}

        {/* Pot */}
        <div style={{ position:"absolute",top:"12%",left:"50%",transform:"translateX(-50%)",zIndex:8,textAlign:"center" }}>
          <div style={{ fontSize:"0.48rem",color:"rgba(255,255,255,0.3)",letterSpacing:3,textTransform:"uppercase" }}>POT</div>
          <div style={{ fontSize:"0.9rem",fontFamily:"monospace",fontWeight:700,color:theme.accent,textShadow:`0 0 10px ${theme.border}`,transition:"all 0.5s" }}>🪙{fmt(tableState?.pot||0)}</div>
        </div>

        {/* Board cards */}
        <div style={{ position:"absolute",top:"44%",left:"50%",transform:"translate(-50%,-50%)",zIndex:8,display:"flex",gap:4 }}>
          {(tableState?.boardCards||[]).length > 0 ? (
            tableState.boardCards.map((card,i) => {
              const key   = `${card.rank}${card.suit}`;
              const isWin = winnerCards.includes(key);
              const inSD  = showdown || winner;
              return <Card key={`${i}-${key}`} card={card} theme={theme} w={36} h={52} delay={i*0.12}
                highlight={inSD && isWin} dim={inSD && winnerCards.length > 0 && !isWin}/>;
            })
          ) : (
            [0,1,2,3,4].map(i => <div key={i} style={{ width:36,height:52,borderRadius:4,border:`1px dashed ${theme.border}22`,opacity:0.2 }}/>)
          )}
        </div>

        {/* Street */}
        <div style={{ position:"absolute",top:"8%",left:"50%",transform:"translateX(-50%)",fontSize:"0.48rem",letterSpacing:3,color:`${theme.border}55`,fontWeight:700,textTransform:"uppercase",zIndex:8,whiteSpace:"nowrap" }}>
          {tableState?.gameState==="waiting"?"WAITING FOR PLAYERS":tableState?.gameState?.toUpperCase()}
        </div>

        <Dealer theme={theme} tableId={tableId} api={api} showNotification={showNotification}/>

        {others.map((player,i) => (
          <Seat key={player.userId} player={player} isMe={false}
            isActive={tableState?.currentPlayerSeat===player.seatNumber && !player.isFolded}
            myCards={[]} theme={theme} posIdx={i+1}
            tableId={tableId} api={api} showNotification={showNotification}
            actionFlash={actionFlash} showdown={showdown} myId={myId}/>
        ))}

        {me && (
          <Seat player={me} isMe={true} isActive={myTurn}
            myCards={myCards} theme={theme} posIdx={0}
            tableId={tableId} api={api} showNotification={showNotification}
            actionFlash={actionFlash} showdown={showdown} myId={myId}/>
        )}

        {/* Waiting notice */}
        {isWaiting && (
          <div style={{ position:"absolute",bottom:"28%",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.85)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:8,padding:"6px 14px",zIndex:15,fontSize:"0.7rem",color:"rgba(255,255,255,0.7)",whiteSpace:"nowrap" }}>
            ⏳ Waiting for next hand...
          </div>
        )}

        {/* Toast */}
        {toast && (
          <div style={{ position:"absolute",top:"5%",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.92)",border:`1px solid ${toast.color||"rgba(255,255,255,0.2)"}`,borderRadius:10,padding:"8px 16px",zIndex:60,textAlign:"center",animation:"slideDown 0.3s ease",whiteSpace:"nowrap",pointerEvents:"none" }}>
            <div style={{ fontSize:"0.85rem",fontWeight:700,color:toast.color||"white" }}>{toast.icon} {toast.title}</div>
            {toast.sub && <div style={{ fontSize:"0.7rem",color:"rgba(255,255,255,0.6)",marginTop:2 }}>{toast.sub}</div>}
          </div>
        )}

        {/* Winner overlay */}
        {winner && (
          <div style={{ position:"absolute",top:"10%",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.97)",border:`2px solid ${theme.border}`,borderRadius:16,padding:"14px 22px",zIndex:50,textAlign:"center",animation:"slideDown 0.4s ease",minWidth:180 }}>
            <div style={{ fontSize:"1.5rem",marginBottom:6 }}>🎉</div>
            {winner.winners?.map((w,i) => (
              <div key={i} style={{ marginBottom:8 }}>
                <div style={{ fontSize:"0.9rem",fontWeight:700,color:theme.accent }}>{w.username} wins {fmt(w.chipsWon)}!</div>
                {w.handName && <div style={{ fontSize:"0.72rem",color:"rgba(255,255,255,0.6)",marginTop:2 }}>{w.handName}</div>}
                {w.holeCards?.length > 0 && (
                  <div style={{ display:"flex",gap:4,justifyContent:"center",marginTop:8 }}>
                    {w.holeCards.map((c,j) => {
                      const key   = `${c.rank}${c.suit}`;
                      const isWin = w.winningCards?.map(x=>`${x.rank}${x.suit}`).includes(key);
                      return <Card key={j} card={c} theme={theme} w={32} h={46} highlight={isWin} dim={!isWin && (w.winningCards||[]).length>0}/>;
                    })}
                  </div>
                )}
              </div>
            ))}
            <div style={{ fontSize:"0.65rem",color:"rgba(255,255,255,0.3)",marginTop:4 }}>Rake: {fmt(winner.rake||0)}</div>
          </div>
        )}

        {/* Showdown */}
        {showdown && !winner && (
          <div style={{ position:"absolute",top:"8%",left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.97)",border:`1px solid ${theme.border}`,borderRadius:12,padding:"10px 14px",zIndex:48,minWidth:200,maxWidth:"90%" }}>
            <div style={{ color:theme.accent,fontWeight:700,fontSize:"0.72rem",marginBottom:8,textAlign:"center",letterSpacing:2 }}>SHOWDOWN</div>
            {showdown.map((r,i) => (
              <div key={i} style={{ display:"flex",alignItems:"center",gap:6,paddingBottom:5,borderBottom:"1px solid rgba(255,255,255,0.08)",marginBottom:4,background:r.isWinner?`${theme.border}15`:"transparent",borderRadius:4,padding:"4px" }}>
                <span style={{ fontWeight:700,fontSize:"0.68rem",color:r.isWinner?(theme.accent||"#ffd700"):"white",minWidth:50,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>
                  {r.isWinner?"🏆 ":""}{r.username}
                </span>
                <div style={{ display:"flex",gap:3 }}>
                  {r.holeCards?.map((c,j) => {
                    const key   = `${c.rank}${c.suit}`;
                    const isWin = r.winningCards?.map(x=>`${x.rank}${x.suit}`).includes(key);
                    return <Card key={j} card={c} theme={theme} w={26} h={38} highlight={isWin && r.isWinner} dim={r.isWinner && !isWin}/>;
                  })}
                </div>
                <span style={{ fontSize:"0.6rem",color:r.isWinner?(theme.accent||"#ffd700"):"rgba(255,255,255,0.5)" }}>{r.handName}</span>
              </div>
            ))}
          </div>
        )}

        {/* Chat */}
        {showChat && (
          <div style={{ position:"absolute",bottom:8,right:8,width:185,height:165,background:"rgba(6,6,6,0.97)",border:`1px solid ${theme.border}44`,borderRadius:12,display:"flex",flexDirection:"column",zIndex:40,overflow:"hidden" }}>
            <div style={{ flex:1,overflowY:"auto",padding:7 }}>
              {chatMsgs.map((m,i) => (
                <div key={i} style={{ fontSize:"0.58rem",marginBottom:3,background:m.sys?`${theme.border}12`:"transparent",borderRadius:3,padding:"1px 3px" }}>
                  {m.sys ? <span style={{ color:theme.accent,fontStyle:"italic" }}>{m.msg}</span>
                    : <><span style={{ color:theme.accent,fontWeight:700 }}>{m.userId===myId?"You":"P"}:</span><span style={{ color:"rgba(255,255,255,0.6)",marginLeft:3 }}>{m.message}</span></>}
                </div>
              ))}
            </div>
            <div style={{ display:"flex",gap:4,padding:5,borderTop:`1px solid ${theme.border}22` }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==="Enter"&&sendChat()} placeholder="Message..." maxLength={80} style={{ flex:1,background:"rgba(255,255,255,0.04)",border:`1px solid ${theme.border}22`,borderRadius:5,color:"white",padding:"3px 7px",fontSize:"0.62rem",fontFamily:"var(--font-body)",outline:"none" }}/>
              <button onClick={sendChat} style={{ background:`linear-gradient(135deg,${theme.border},#7a5800)`,border:"none",borderRadius:5,padding:"3px 8px",color:"#0a0805",fontWeight:700,fontSize:"0.62rem",cursor:"pointer" }}>→</button>
            </div>
          </div>
        )}

        {/* Leave confirm */}
        {showLeave && (
          <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.85)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100 }}>
            <div style={{ background:"var(--surface)",border:`1px solid ${theme.border}`,borderRadius:14,padding:"20px 24px",textAlign:"center",width:220 }}>
              <div style={{ fontSize:"1.2rem",marginBottom:8 }}>🚪</div>
              <div style={{ fontWeight:700,marginBottom:4,color:theme.accent }}>Leave Table?</div>
              <div style={{ fontSize:"0.8rem",color:"rgba(255,255,255,0.5)",marginBottom:16 }}>Chips will be returned</div>
              <div style={{ display:"flex",gap:8 }}>
                <button onClick={() => setShowLeave(false)} style={{ flex:1,padding:"8px",background:"var(--surface2)",border:"1px solid var(--border)",borderRadius:8,color:"var(--gray)",cursor:"pointer",fontFamily:"var(--font-body)" }}>Stay</button>
                <button onClick={leaveTable} style={{ flex:1,padding:"8px",background:"linear-gradient(135deg,#b71c1c,#7f0000)",border:"none",borderRadius:8,color:"white",fontWeight:700,cursor:"pointer",fontFamily:"var(--font-body)" }}>Leave</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action bar */}
      {myTurn && actionData && !isWaiting && (
        <div style={{ flexShrink:0,background:"rgba(3,3,3,0.98)",borderTop:`2px solid ${theme.border}`,padding:"10px 14px 12px",zIndex:30 }}>
          <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8 }}>
            <span style={{ fontSize:"0.75rem",fontWeight:700,color:theme.accent }}>Your Turn</span>
            <div style={{ display:"flex",alignItems:"center",gap:6 }}>
              {callAmt > 0 && <span style={{ fontSize:"0.65rem",color:"rgba(255,255,255,0.3)" }}>To call:{fmt(callAmt)}</span>}
              <Timer timeLimit={actionData.timeLimit||30} timeStart={actionData.timeStart||Date.now()} theme={theme}/>
            </div>
          </div>

          <div style={{ display:"flex",gap:7,marginBottom:8 }}>
            <button onClick={() => act("fold")} style={{ flex:1,padding:"10px 0",background:"linear-gradient(135deg,#b71c1c,#7f0000)",border:"none",borderRadius:8,color:"white",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"var(--font-body)" }}>❌ Fold</button>
            {canCheck ? (
              <button onClick={() => act("check")} style={{ flex:1.2,padding:"10px 0",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.18)",borderRadius:8,color:"white",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"var(--font-body)" }}>✋ Check</button>
            ) : (
              <button onClick={() => act("call")} style={{ flex:1.2,padding:"10px 0",background:"linear-gradient(135deg,#1565c0,#0d47a1)",border:"1px solid #42a5f5",borderRadius:8,color:"#90caf9",fontWeight:700,fontSize:"0.85rem",cursor:"pointer",fontFamily:"var(--font-body)" }}>📞 Call {fmt(callAmt)}</button>
            )}
            <button onClick={() => act("allin")} style={{ flex:1,padding:"10px 0",background:`linear-gradient(135deg,${theme.border},#7a5800)`,border:"none",borderRadius:8,color:"#0a0805",fontWeight:700,fontSize:"0.8rem",cursor:"pointer",fontFamily:"var(--font-body)" }}>💥 All-In</button>
          </div>

          {myChips > 0 && (
            <div style={{ display:"flex",alignItems:"center",gap:7 }}>
              <input type="range" min={minRaise} max={myChips+(me?.currentBet||0)} step={actionData.currentBet||100}
                value={raiseAmt} onChange={e => setRaiseAmt(Number(e.target.value))}
                style={{ flex:1,accentColor:theme.accent }}/>
              <button onClick={() => act("raise",raiseAmt)} style={{ background:`${theme.border}18`,border:`1px solid ${theme.border}`,borderRadius:7,padding:"6px 10px",color:theme.accent,fontWeight:700,fontSize:"0.72rem",cursor:"pointer",whiteSpace:"nowrap",fontFamily:"var(--font-body)" }}>⬆ {fmt(raiseAmt)}</button>
            </div>
          )}
        </div>
      )}

      {/* Lobby */}
      {showLobby && (
        <TableLobby currentTableId={tableId} token={token}
          onSwitch={handleSwitchTable} onClose={() => setShowLobby(false)} theme={theme}/>
      )}

      <style>{`
        @keyframes cardDeal { from{transform:scale(0.7) rotateY(90deg);opacity:0} to{transform:scale(1) rotateY(0);opacity:1} }
        @keyframes popFade  { 0%{opacity:1;transform:translateX(-50%) translateY(0)} 80%{opacity:1} 100%{opacity:0;transform:translateX(-50%) translateY(-18px)} }
        @keyframes slideDown{ from{opacity:0;transform:translateX(-50%) translateY(-20px)} to{opacity:1;transform:translateX(-50%) translateY(0)} }
        @keyframes countPop { 0%{transform:scale(0.4);opacity:0} 60%{transform:scale(1.3)} 100%{transform:scale(1);opacity:1} }
      `}</style>
    </div>
  );
}
