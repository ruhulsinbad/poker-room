// pages/Tasks.jsx — Earn Chips via Tasks

import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";
import { WebApp } from "@twa-dev/sdk";

export default function Tasks() {
  const { api, user, updateUser, showNotification } = useStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(null);

  useEffect(() => { loadTasks(); }, []);

  async function loadTasks() {
    try {
      const data = await api("/api/tasks");
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }

  async function claimTask(task) {
    if (claiming) return;
    setClaiming(task.id);

    try {
      // Handle action first
      if (task.action_type === "join_channel") {
        WebApp.openTelegramLink(`https://t.me/${task.action_value?.replace("@", "")}`);
        await new Promise(r => setTimeout(r, 2000));
      } else if (task.action_type === "follow_twitter") {
        WebApp.openLink(`https://twitter.com/${task.action_value?.replace("@", "")}`);
        await new Promise(r => setTimeout(r, 2000));
      }

      const result = await api(`/api/tasks/${task.id}/complete`, { method: "POST" });

      updateUser({ chips: (user?.chips || 0) + result.chipsEarned });

      if (result.leveledUp) {
        showNotification(`🎉 Level Up! You're now Level ${result.newLevel}!`, "success");
      } else {
        showNotification(`✅ +${result.chipsEarned.toLocaleString()} chips!`, "success");
      }

      loadTasks();
    } catch (err) {
      showNotification(err.message || "Failed to claim", "error");
    } finally {
      setClaiming(null);
    }
  }

  const grouped = {
    daily: tasks.filter(t => t.task_type === "daily"),
    social: tasks.filter(t => t.task_type === "social" || t.action_type?.includes("follow") || t.action_type?.includes("join")),
    game: tasks.filter(t => t.task_type === "game"),
    one_time: tasks.filter(t => t.task_type === "one_time" && !t.action_type?.includes("follow") && !t.action_type?.includes("join")),
  };

  return (
    <div className="page">
      <div className="page-header px-16">
        <div className="page-title">📋 Earn Chips</div>
        <div className="text-gray text-sm">Complete tasks to earn free chips</div>
      </div>

      {/* Balance */}
      <div className="chips-hero px-16">
        <div className="chips-icon-big">🪙</div>
        <div className="chips-balance-big font-mono">
          {(user?.chips || 0).toLocaleString()}
        </div>
        <div className="text-gray text-sm">Your Chips</div>
      </div>

      {loading ? (
        <div className="px-16 text-gray text-center" style={{ paddingTop: 40 }}>
          Loading tasks...
        </div>
      ) : (
        <div className="tasks-container px-16">
          {Object.entries(grouped).map(([type, typeTasks]) => {
            if (!typeTasks.length) return null;
            return (
              <div key={type} className="task-group">
                <div className="task-group-title">
                  {type === "daily" && "🌅 Daily"}
                  {type === "social" && "📱 Social"}
                  {type === "game" && "🃏 Game"}
                  {type === "one_time" && "⚡ One-time"}
                </div>
                {typeTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onClaim={() => claimTask(task)}
                    loading={claiming === task.id}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .chips-hero {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          padding: 24px 16px;
          margin-bottom: 8px;
        }
        .chips-icon-big { font-size: 2.5rem; }
        .chips-balance-big {
          font-size: 2rem;
          color: var(--gold-light);
          font-weight: 700;
        }
        .tasks-container { display: flex; flex-direction: column; gap: 20px; }
        .task-group { display: flex; flex-direction: column; gap: 8px; }
        .task-group-title {
          font-weight: 700;
          font-size: 0.85rem;
          color: var(--gray-light);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding-bottom: 4px;
        }
        .task-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--radius);
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          transition: border-color 0.2s;
        }
        .task-card.completed { opacity: 0.5; }
        .task-icon {
          width: 44px; height: 44px;
          border-radius: var(--radius-sm);
          background: var(--surface2);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.4rem;
          flex-shrink: 0;
        }
        .task-info { flex: 1; }
        .task-name { font-weight: 700; font-size: 0.9rem; margin-bottom: 2px; }
        .task-desc { font-size: 0.75rem; color: var(--gray-light); }
        .task-reward {
          display: flex;
          align-items: center;
          gap: 3px;
          font-family: var(--font-mono);
          font-size: 0.85rem;
          color: var(--gold);
          font-weight: 700;
          margin-top: 4px;
        }
        .task-btn {
          flex-shrink: 0;
          padding: 8px 14px;
          border-radius: var(--radius-sm);
          font-weight: 700;
          font-size: 0.8rem;
          cursor: pointer;
          border: none;
        }
        .task-btn.claimable {
          background: linear-gradient(135deg, var(--gold), #a07830);
          color: #0a0805;
        }
        .task-btn.done {
          background: var(--surface2);
          color: var(--gray);
          cursor: default;
        }
        .task-btn.loading {
          opacity: 0.7;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

function TaskCard({ task, onClaim, loading }) {
  const isDone = task.status === "claimed";

  const icons = {
    daily_login: "📅",
    join_channel: "📢",
    follow_twitter: "🐦",
    invite: "👥",
    play_hands: "🃏",
    win_hands: "🏆",
    connect_wallet: "💎",
  };

  return (
    <div className={`task-card ${isDone ? "completed" : ""}`}>
      <div className="task-icon">
        {icons[task.action_type] || "⚡"}
      </div>
      <div className="task-info">
        <div className="task-name">{task.title}</div>
        <div className="task-desc">{task.description}</div>
        <div className="task-reward">
          🪙 +{task.chips_reward?.toLocaleString()} chips
          {task.xp_reward > 0 && (
            <span style={{ color: "var(--gray-light)", fontSize: "0.75rem", marginLeft: 4 }}>
              +{task.xp_reward} XP
            </span>
          )}
        </div>
      </div>
      <button
        className={`task-btn ${isDone ? "done" : "claimable"} ${loading ? "loading" : ""}`}
        onClick={!isDone && !loading ? onClaim : undefined}
        disabled={isDone || loading}
      >
        {isDone ? "✓ Done" : loading ? "..." : "Claim"}
      </button>
    </div>
  );
}
