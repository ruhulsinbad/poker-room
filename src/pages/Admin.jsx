// pages/Admin.jsx — Full Admin Control Panel

import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const { api, user, showNotification } = useStore();
  const navigate = useNavigate();
  const [tab, setTab] = useState("dashboard");
  const [stats, setStats] = useState(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const data = await api("/api/admin/stats");
      setStats(data);
    } catch {}
  }

  const tabs = [
    { id: "dashboard", label: "📊 Dashboard" },
    { id: "users",     label: "👥 Users" },
    { id: "tasks",     label: "📋 Tasks" },
    { id: "tables",    label: "🃏 Tables" },
    { id: "chips",     label: "🪙 Chips" },
    { id: "broadcast", label: "📢 Broadcast" },
  ];

  return (
    <div className="page">
      <div className="page-header px-16">
        <div className="page-title">⚙️ Admin Panel</div>
      </div>

      <div style={{ display: "flex", gap: 6, padding: "0 16px 16px", overflowX: "auto" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? "rgba(201,168,76,0.15)" : "var(--surface)",
            border: `1px solid ${tab === t.id ? "var(--gold-dim)" : "var(--border)"}`,
            borderRadius: "var(--radius-sm)", padding: "8px 12px",
            color: tab === t.id ? "var(--gold)" : "var(--gray-light)",
            fontWeight: 700, fontSize: "0.75rem", cursor: "pointer",
            whiteSpace: "nowrap", fontFamily: "var(--font-body)",
          }}>{t.label}</button>
        ))}
      </div>

      <div className="px-16">
        {tab === "dashboard" && <Dashboard stats={stats} onRefresh={loadStats} />}
        {tab === "users"     && <UserManagement api={api} showNotification={showNotification} />}
        {tab === "tasks"     && <TaskManagement api={api} showNotification={showNotification} />}
        {tab === "tables"    && <TableManagement api={api} showNotification={showNotification} />}
        {tab === "chips"     && <ChipsControl api={api} showNotification={showNotification} />}
        {tab === "broadcast" && <Broadcast api={api} showNotification={showNotification} />}
      </div>
    </div>
  );
}

function Dashboard({ stats, onRefresh }) {
  if (!stats) return <div className="text-gray text-center" style={{ paddingTop: 40 }}>Loading...</div>;
  const cards = [
    { label: "Total Users", value: stats.totalUsers?.toLocaleString(), icon: "👥" },
    { label: "Active Today", value: stats.activeToday?.toLocaleString(), icon: "🟢" },
    { label: "Active Tables", value: stats.activeTables, icon: "🃏" },
    { label: "Total Chips", value: `${((stats.totalChips||0)/1e6).toFixed(1)}M`, icon: "🪙" },
    { label: "Premium Chips", value: `${((stats.totalPremiumChips||0)/1e6).toFixed(1)}M`, icon: "💎" },
    { label: "Top Referrer", value: stats.topReferrer?.username || "-", icon: "🏆" },
  ];
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: "1.5rem", marginBottom: 4 }}>{c.icon}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.1rem", color: "var(--gold-light)", fontWeight: 700 }}>{c.value}</div>
            <div className="text-gray text-xs">{c.label}</div>
          </div>
        ))}
      </div>
      <button className="btn btn-outline btn-full" onClick={onRefresh}>↻ Refresh</button>
    </div>
  );
}

function UserManagement({ api, showNotification }) {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [chipsForm, setChipsForm] = useState({ amount: 1000, chips_type: "chips", reason: "" });

  useEffect(() => { loadUsers(); }, [search, filter]);

  async function loadUsers() {
    try {
      const data = await api(`/api/admin/users?search=${search}&filter=${filter}`);
      setUsers(data.users || []);
    } catch {}
  }

  async function selectUser(u) {
    try {
      const data = await api(`/api/admin/users/${u.id}`);
      setSelected(data.user);
      setEditForm({ chips: data.user.chips, premium_chips: data.user.premium_chips, level: data.user.level, is_early_access: data.user.is_early_access, is_influencer: data.user.is_influencer, is_banned: data.user.is_banned });
    } catch {}
  }

  async function saveEdit() {
    try {
      await api(`/api/admin/users/${selected.id}`, { method: "PATCH", body: editForm });
      showNotification("Saved!", "success"); setSelected(null); loadUsers();
    } catch (err) { showNotification(err.message, "error"); }
  }

  async function deleteUser() {
    if (!confirm("Delete user?")) return;
    try { await api(`/api/admin/users/${selected.id}`, { method: "DELETE" }); showNotification("Deleted", "success"); setSelected(null); loadUsers(); }
    catch (err) { showNotification(err.message, "error"); }
  }

  async function toggleBan() {
    const b = !selected.is_banned;
    try { await api(`/api/admin/users/${selected.id}/ban`, { method: "POST", body: { banned: b } }); showNotification(b ? "Banned" : "Unbanned", "success"); setSelected(p => ({ ...p, is_banned: b })); loadUsers(); }
    catch (err) { showNotification(err.message, "error"); }
  }

  async function giveChips() {
    try { await api(`/api/admin/users/${selected.id}/chips`, { method: "POST", body: chipsForm }); showNotification("Chips given!", "success"); }
    catch (err) { showNotification(err.message, "error"); }
  }

  const fmt = n => n?.toLocaleString() || "0";

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <input className="admin-input" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1 }} />
        <select className="admin-input" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 110 }}>
          <option value="all">All</option>
          <option value="influencer">Influencer</option>
          <option value="early">Early Access</option>
          <option value="banned">Banned</option>
        </select>
      </div>

      {users.map(u => (
        <div key={u.id} className="card" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, cursor: "pointer", borderColor: u.is_banned ? "var(--red-dim)" : "var(--border)" }} onClick={() => selectUser(u)}>
          <div className="avatar avatar-sm">{(u.username || u.first_name || "?")?.[0]?.toUpperCase()}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>
              {u.username || u.first_name || "Unknown"}
              {u.is_banned && <span className="badge badge-red" style={{ marginLeft: 6 }}>Banned</span>}
              {u.is_influencer && <span className="badge badge-green" style={{ marginLeft: 6 }}>Influencer</span>}
            </div>
            <div className="text-gray text-xs">Lv.{u.level} · 🪙{fmt(u.chips)} · 💎{fmt(u.premium_chips)} · {u.total_referrals} refs</div>
          </div>
          <span style={{ color: "var(--gold)" }}>›</span>
        </div>
      ))}

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end", zIndex: 200 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "20px 20px 0 0", padding: "20px 16px", width: "100%", maxWidth: 430, margin: "0 auto", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ fontWeight: 700, color: "var(--gold)" }}>{selected.username || selected.first_name}</div>
              <button onClick={() => setSelected(null)} style={{ background: "none", border: "none", color: "var(--gray)", fontSize: "1.2rem", cursor: "pointer" }}>✕</button>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              {[["Telegram ID", selected.telegram_id], ["Chips", fmt(selected.chips)], ["Premium", fmt(selected.premium_chips)], ["Level", selected.level], ["Referrals", selected.total_referrals], ["Hands", selected.total_hands]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: "1px solid var(--border)", fontSize: "0.85rem" }}>
                  <span className="text-gray">{k}</span>
                  <span className="font-mono" style={{ color: "var(--gold-light)" }}>{v}</span>
                </div>
              ))}
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: "var(--gold)" }}>✏️ Edit</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                {[["Chips", "chips"], ["Premium Chips", "premium_chips"], ["Level", "level"]].map(([l, k]) => (
                  <div key={k} className="admin-input-group">
                    <label className="admin-label">{l}</label>
                    <input className="admin-input" type="number" value={editForm[k] || 0} onChange={e => setEditForm(p => ({ ...p, [k]: Number(e.target.value) }))} />
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                {[["Early Access", "is_early_access"], ["Influencer", "is_influencer"], ["Banned", "is_banned"]].map(([label, key]) => (
                  <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", cursor: "pointer" }}>
                    <input type="checkbox" checked={editForm[key] || false} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.checked }))} style={{ accentColor: "var(--gold)" }} />
                    {label}
                  </label>
                ))}
              </div>
              <button className="btn btn-gold btn-full btn-sm" onClick={saveEdit}>Save Changes</button>
            </div>

            <div className="card" style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: "var(--gold)" }}>🪙 Give Chips</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                <div className="admin-input-group"><label className="admin-label">Amount</label><input className="admin-input" type="number" value={chipsForm.amount} onChange={e => setChipsForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
                <div className="admin-input-group"><label className="admin-label">Type</label><select className="admin-input" value={chipsForm.chips_type} onChange={e => setChipsForm(p => ({ ...p, chips_type: e.target.value }))}><option value="chips">Chips</option><option value="premium_chips">Premium</option></select></div>
              </div>
              <div className="admin-input-group"><label className="admin-label">Reason</label><input className="admin-input" value={chipsForm.reason} onChange={e => setChipsForm(p => ({ ...p, reason: e.target.value }))} placeholder="Reason..." /></div>
              <button className="btn btn-outline btn-full btn-sm" onClick={giveChips}>Give Chips</button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button className={`btn btn-sm ${selected.is_banned ? "btn-gold" : "btn-red"}`} style={{ flex: 1 }} onClick={toggleBan}>{selected.is_banned ? "Unban" : "Ban"}</button>
              <button className="btn btn-red btn-sm" style={{ flex: 1 }} onClick={deleteUser}>Delete</button>
            </div>
          </div>
        </div>
      )}
      <style>{adminCSS}</style>
    </div>
  );
}

function TaskManagement({ api, showNotification }) {
  const [tasks, setTasks] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", task_type: "one_time", chips_reward: 2000, xp_reward: 200, action_type: "join_channel", action_value: "", action_url: "" });

  useEffect(() => { loadTasks(); }, []);
  async function loadTasks() { try { const d = await api("/api/admin/tasks"); setTasks(d); } catch {} }
  async function createTask() { try { await api("/api/admin/tasks", { method: "POST", body: form }); showNotification("Created!", "success"); setShowForm(false); loadTasks(); } catch (err) { showNotification(err.message, "error"); } }
  async function toggleTask(id, active) { await api(`/api/admin/tasks/${id}`, { method: "PATCH", body: { is_active: !active } }); loadTasks(); }
  async function deleteTask(id) { if (!confirm("Delete?")) return; await api(`/api/admin/tasks/${id}`, { method: "DELETE" }); loadTasks(); }

  const actionTypes = [
    { value: "join_channel", label: "📢 Join Telegram Channel" },
    { value: "follow_twitter", label: "🐦 Follow Twitter/X" },
    { value: "invite", label: "👥 Invite Friends (count)" },
    { value: "play_hands", label: "🃏 Play X Hands" },
    { value: "win_hands", label: "🏆 Win X Hands" },
    { value: "connect_wallet", label: "💎 Connect TON Wallet" },
    { value: "daily_login", label: "📅 Daily Login" },
    { value: "custom_url", label: "🔗 Visit Custom URL" },
  ];

  const placeholders = { join_channel: "@channelname", follow_twitter: "@twitter_handle", invite: "5", play_hands: "10", win_hands: "5" };

  return (
    <div>
      <button className="btn btn-gold btn-full" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>{showForm ? "✕ Cancel" : "➕ New Task"}</button>

      {showForm && (
        <div className="card card-gold" style={{ marginBottom: 16 }}>
          {[["Task Title", "title", "e.g. Follow us on Twitter"], ["Description", "description", "Short description"]].map(([l, k, p]) => (
            <div key={k} className="admin-input-group"><label className="admin-label">{l}</label><input className="admin-input" value={form[k]} onChange={e => setForm(p2 => ({ ...p2, [k]: e.target.value }))} placeholder={p} /></div>
          ))}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["Chips Reward", "chips_reward"], ["XP Reward", "xp_reward"]].map(([l, k]) => (
              <div key={k} className="admin-input-group"><label className="admin-label">{l}</label><input className="admin-input" type="number" value={form[k]} onChange={e => setForm(p2 => ({ ...p2, [k]: Number(e.target.value) }))} /></div>
            ))}
          </div>
          <div className="admin-input-group"><label className="admin-label">Task Type</label><select className="admin-input" value={form.task_type} onChange={e => setForm(p2 => ({ ...p2, task_type: e.target.value }))}><option value="one_time">One-time</option><option value="daily">Daily</option><option value="social">Social</option><option value="game">Game</option></select></div>
          <div className="admin-input-group"><label className="admin-label">Action Type</label><select className="admin-input" value={form.action_type} onChange={e => setForm(p2 => ({ ...p2, action_type: e.target.value }))}>{actionTypes.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div>
          <div className="admin-input-group"><label className="admin-label">Action Value</label><input className="admin-input" value={form.action_value} onChange={e => setForm(p2 => ({ ...p2, action_value: e.target.value }))} placeholder={placeholders[form.action_type] || ""} /></div>
          <button className="btn btn-gold btn-full" onClick={createTask}>Create Task</button>
        </div>
      )}

      {tasks.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, opacity: t.is_active ? 1 : 0.5 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t.title}</div>
            <div className="text-gray text-xs">{t.action_type} · 🪙{t.chips_reward?.toLocaleString()} · {t.xp_reward} XP</div>
            {t.action_value && <div className="text-xs" style={{ color: "var(--gold-dim)" }}>{t.action_value}</div>}
          </div>
          <button className={`btn btn-sm ${t.is_active ? "btn-dark" : "btn-gold"}`} onClick={() => toggleTask(t.id, t.is_active)}>{t.is_active ? "Disable" : "Enable"}</button>
          <button className="btn btn-sm btn-red" onClick={() => deleteTask(t.id)}>✕</button>
        </div>
      ))}
      <style>{adminCSS}</style>
    </div>
  );
}

function TableManagement({ api, showNotification }) {
  const [tables, setTables] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", small_blind: 50, big_blind: 100, min_buy_in: 2000, max_buy_in: 20000, max_players: 6, chips_type: "chips" });

  useEffect(() => { loadTables(); }, []);
  async function loadTables() { try { const d = await api("/api/admin/tables"); setTables(d); } catch {} }
  async function createTable() { try { await api("/api/admin/tables", { method: "POST", body: form }); showNotification("Table created!", "success"); setShowForm(false); loadTables(); } catch (err) { showNotification(err.message, "error"); } }
  async function toggleTable(id, status) { await api(`/api/admin/tables/${id}`, { method: "PATCH", body: { status: status === "active" ? "closed" : "active" } }); loadTables(); }
  async function deleteTable(id) { if (!confirm("Delete table?")) return; await api(`/api/admin/tables/${id}`, { method: "DELETE" }); loadTables(); }

  const fmt = n => n >= 1000 ? `${(n/1000).toFixed(0)}K` : n;

  return (
    <div>
      <button className="btn btn-gold btn-full" style={{ marginBottom: 16 }} onClick={() => setShowForm(!showForm)}>{showForm ? "✕ Cancel" : "➕ New Table"}</button>
      {showForm && (
        <div className="card card-gold" style={{ marginBottom: 16 }}>
          <div className="admin-input-group"><label className="admin-label">Table Name</label><input className="admin-input" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Beginner Table" /></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["Small Blind","small_blind"],["Big Blind","big_blind"],["Min Buy-in","min_buy_in"],["Max Buy-in","max_buy_in"],["Max Players","max_players"]].map(([l,k]) => (
              <div key={k} className="admin-input-group"><label className="admin-label">{l}</label><input className="admin-input" type="number" value={form[k]} onChange={e => setForm(p => ({ ...p, [k]: Number(e.target.value) }))} /></div>
            ))}
          </div>
          <div className="admin-input-group"><label className="admin-label">Chips Type</label><select className="admin-input" value={form.chips_type} onChange={e => setForm(p => ({ ...p, chips_type: e.target.value }))}><option value="chips">🪙 Regular Chips</option><option value="premium_chips">💎 Premium Chips</option></select></div>
          <button className="btn btn-gold btn-full" onClick={createTable}>Create Table</button>
        </div>
      )}
      {tables.map(t => (
        <div key={t.id} className="card" style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 10, opacity: t.status === "closed" ? 0.5 : 1 }}>
          <div style={{ fontSize: "1.5rem" }}>{t.chips_type === "premium_chips" ? "💎" : "🃏"}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "0.9rem" }}>{t.name}</div>
            <div className="text-gray text-xs">{fmt(t.small_blind)}/{fmt(t.big_blind)} · {fmt(t.min_buy_in)}-{fmt(t.max_buy_in)}</div>
            <div className="text-xs" style={{ color: t.live_players > 0 ? "#5dcc5d" : "var(--gray)" }}>{t.live_players}/{t.max_players} players · {t.status}</div>
          </div>
          <button className={`btn btn-sm ${t.status === "active" ? "btn-dark" : "btn-gold"}`} onClick={() => toggleTable(t.id, t.status)}>{t.status === "active" ? "Close" : "Open"}</button>
          <button className="btn btn-sm btn-red" onClick={() => deleteTable(t.id)}>✕</button>
        </div>
      ))}
      <style>{adminCSS}</style>
    </div>
  );
}

function ChipsControl({ api, showNotification }) {
  const [form, setForm] = useState({ amount: 5000, chips_type: "chips", reason: "Welcome bonus airdrop" });
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  async function giveAll() {
    if (!confirm(`Give ${form.amount.toLocaleString()} ${form.chips_type} to ALL users?`)) return;
    setSending(true);
    try { const d = await api("/api/admin/users/chips/all", { method: "POST", body: form }); setResult(d); showNotification(`Sent to ${d.usersAffected} users!`, "success"); }
    catch (err) { showNotification(err.message, "error"); }
    finally { setSending(false); }
  }

  return (
    <div>
      <div className="card card-gold" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>🎁 Airdrop to ALL Users</div>
        <div className="text-gray text-sm" style={{ marginBottom: 12 }}>সব user কে একসাথে chips দাও।</div>
        <div className="admin-input-group"><label className="admin-label">Amount per user</label><input className="admin-input" type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: Number(e.target.value) }))} /></div>
        <div className="admin-input-group"><label className="admin-label">Chips Type</label><select className="admin-input" value={form.chips_type} onChange={e => setForm(p => ({ ...p, chips_type: e.target.value }))}><option value="chips">🪙 Regular Chips</option><option value="premium_chips">💎 Premium Chips</option></select></div>
        <div className="admin-input-group"><label className="admin-label">Reason</label><input className="admin-input" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} /></div>
        <button className="btn btn-gold btn-full" onClick={giveAll} disabled={sending}>{sending ? "Sending..." : `🚀 Airdrop to All Users`}</button>
        {result && <div style={{ marginTop: 12, padding: 10, background: "rgba(50,200,50,0.1)", borderRadius: "var(--radius-sm)", textAlign: "center", color: "#5dcc5d" }}>✅ Sent to {result.usersAffected} users!</div>}
      </div>
      <div className="card">
        <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 8 }}>ℹ️ Chips Info</div>
        <div className="text-gray text-sm" style={{ lineHeight: 2 }}>
          • New user পায়: <strong style={{color:"var(--gold)"}}>10,000 chips</strong><br/>
          • Referral bonus: <strong style={{color:"var(--gold)"}}>3% (influencer 5%)</strong><br/>
          • Task reward: আলাদা<br/>
          • Level up: আলাদা bonus
        </div>
      </div>
      <style>{adminCSS}</style>
    </div>
  );
}

function Broadcast({ api, showNotification }) {
  const [form, setForm] = useState({ title: "", message: "", target: "all" });
  const [sending, setSending] = useState(false);

  async function send() {
    if (!form.title || !form.message) return;
    setSending(true);
    try { const d = await api("/api/admin/broadcast", { method: "POST", body: form }); showNotification(`Sent to ${d.sent} users!`, "success"); setForm({ title: "", message: "", target: "all" }); }
    catch (err) { showNotification(err.message, "error"); }
    finally { setSending(false); }
  }

  return (
    <div className="card card-gold">
      <div style={{ fontWeight: 700, color: "var(--gold)", marginBottom: 12 }}>📢 Send Notification</div>
      <div className="admin-input-group"><label className="admin-label">Title</label><input className="admin-input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="e.g. Weekend Bonus! 🎉" /></div>
      <div className="admin-input-group"><label className="admin-label">Message</label><textarea className="admin-input" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} rows={4} placeholder="Write your message..." style={{ resize: "vertical" }} /></div>
      <div className="admin-input-group"><label className="admin-label">Target</label><select className="admin-input" value={form.target} onChange={e => setForm(p => ({ ...p, target: e.target.value }))}><option value="all">Everyone</option><option value="level_10_plus">Level 10+ only</option><option value="influencers">Influencers only</option><option value="early_access">Early Access only</option></select></div>
      <button className="btn btn-gold btn-full" onClick={send} disabled={sending}>{sending ? "Sending..." : "📤 Send Broadcast"}</button>
      <style>{adminCSS}</style>
    </div>
  );
}

const adminCSS = `
  .admin-input-group { margin-bottom: 10px; }
  .admin-label { display: block; font-size: 0.72rem; color: var(--gray-light); margin-bottom: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .admin-input { width: 100%; background: var(--surface2); border: 1px solid var(--border); border-radius: var(--radius-sm); color: white; padding: 10px 12px; font-size: 0.9rem; font-family: var(--font-body); outline: none; }
  .admin-input:focus { border-color: var(--gold-dim); }
`;
