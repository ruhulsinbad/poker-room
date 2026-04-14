// GameFeatures.jsx — Tips + Card Indicator UI components
// Game.jsx এ import করে use করবে

import { useState, useEffect } from "react";
import { useStore } from "../store/useStore";

// ─── Card Strength Indicator ──────────────────────────────────────────────────

export function CardIndicator({ tableId, holeCards, boardCards, socket }) {
    const { api, showNotification } = useStore();
    const [active, setActive] = useState(false);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    // Listen for indicator results from socket
    useEffect(() => {
        if (!socket) return;
        socket.on('indicator_result', (data) => {
            if (data.error) return;
            setResult(data);
        });
        return () => socket.off('indicator_result');
    }, [socket]);

    // Auto-calculate when cards change
    useEffect(() => {
        if (!active || !holeCards?.length) return;
        socket?.emit('request_indicator', { holeCards, boardCards: boardCards || [] });
    }, [holeCards, boardCards, active]);

    async function activate() {
        setLoading(true);
        try {
            await api('/api/game/indicator/activate', { method: 'POST' });
            setActive(true);
            showNotification('💡 Card Indicator activated!', 'success');
        } catch (err) {
            showNotification(err.message || 'Failed', 'error');
        } finally {
            setLoading(false);
        }
    }

    if (!active) {
        return (
            <button
                onClick={activate}
                disabled={loading}
                style={{
                    background: 'rgba(201,168,76,0.15)',
                    border: '1px solid var(--gold-dim)',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: 'var(--gold)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                }}
            >
                {loading ? '...' : '💡 Indicator (500 chips)'}
            </button>
        );
    }

    if (!result) {
        return (
            <div style={{
                background: 'rgba(201,168,76,0.1)',
                border: '1px solid var(--gold-dim)',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                color: 'var(--gold)',
            }}>
                💡 Calculating...
            </div>
        );
    }

    return (
        <div style={{
            background: `${result.color}22`,
            border: `1px solid ${result.color}88`,
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
        }}>
            <div style={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: `conic-gradient(${result.color} ${result.winProbability}%, var(--surface2) 0)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.6rem',
                fontWeight: 700,
                color: result.color,
            }}>
                {result.winProbability}%
            </div>
            <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: result.color }}>
                    {result.category}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--gray)' }}>
                    Win probability
                </div>
            </div>
        </div>
    );
}

// ─── Tip Button ───────────────────────────────────────────────────────────────

export function TipButton({ tableId, targetPlayer, onTipSent }) {
    const { api, showNotification } = useStore();
    const [show, setShow] = useState(false);
    const [amount, setAmount] = useState(500);
    const [sending, setSending] = useState(false);

    const TIP_PRESETS = [100, 500, 1000, 5000];

    async function sendTip() {
        setSending(true);
        try {
            await api('/api/game/tip', {
                method: 'POST',
                body: { tableId, recipientId: targetPlayer.userId, amount }
            });
            showNotification(`🎁 Tipped ${amount.toLocaleString()} chips!`, 'success');
            setShow(false);
            onTipSent?.(amount);
        } catch (err) {
            showNotification(err.message || 'Tip failed', 'error');
        } finally {
            setSending(false);
        }
    }

    return (
        <div style={{ position: 'relative' }}>
            <button
                onClick={() => setShow(!show)}
                style={{
                    background: 'none',
                    border: '1px solid var(--border)',
                    borderRadius: '4px',
                    padding: '3px 8px',
                    color: 'var(--gray-light)',
                    fontSize: '0.7rem',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-body)',
                }}
            >
                🎁 Tip
            </button>

            {show && (
                <div style={{
                    position: 'absolute',
                    bottom: '110%',
                    left: 0,
                    background: 'var(--surface)',
                    border: '1px solid var(--gold-dim)',
                    borderRadius: '10px',
                    padding: '12px',
                    zIndex: 100,
                    minWidth: 160,
                    boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
                }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--gold)', fontWeight: 700, marginBottom: 8 }}>
                        Tip {targetPlayer.username}
                    </div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                        {TIP_PRESETS.map(p => (
                            <button
                                key={p}
                                onClick={() => setAmount(p)}
                                style={{
                                    background: amount === p ? 'var(--gold-dim)' : 'var(--surface2)',
                                    border: `1px solid ${amount === p ? 'var(--gold)' : 'var(--border)'}`,
                                    borderRadius: '4px',
                                    padding: '4px 8px',
                                    color: amount === p ? 'var(--gold)' : 'var(--gray-light)',
                                    fontSize: '0.7rem',
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-body)',
                                }}
                            >
                                {p >= 1000 ? `${p/1000}K` : p}
                            </button>
                        ))}
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button
                            onClick={() => setShow(false)}
                            style={{
                                flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)',
                                borderRadius: '4px', padding: '6px', color: 'var(--gray)',
                                fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={sendTip}
                            disabled={sending}
                            style={{
                                flex: 1,
                                background: 'linear-gradient(135deg, var(--gold), #a07830)',
                                border: 'none', borderRadius: '4px', padding: '6px',
                                color: '#0a0805', fontSize: '0.75rem', fontWeight: 700,
                                cursor: 'pointer', fontFamily: 'var(--font-body)',
                            }}
                        >
                            {sending ? '...' : `Send`}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Task Push Notification ───────────────────────────────────────────────────

export function TaskPushListener({ socket }) {
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        if (!socket) return;

        socket.on('new_task', (data) => {
            setNotification(data);
            setTimeout(() => setNotification(null), 6000);
        });

        socket.on('broadcast', (data) => {
            setNotification({ message: `📢 ${data.title}: ${data.message}` });
            setTimeout(() => setNotification(null), 6000);
        });

        return () => {
            socket.off('new_task');
            socket.off('broadcast');
        };
    }, [socket]);

    if (!notification) return null;

    return (
        <div style={{
            position: 'fixed',
            top: 16,
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'var(--surface)',
            border: '1px solid var(--gold-dim)',
            borderRadius: '12px',
            padding: '12px 20px',
            zIndex: 9999,
            maxWidth: 'calc(100vw - 32px)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.6)',
            animation: 'slideDown 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
        }}>
            <span style={{ fontSize: '1.2rem' }}>🆕</span>
            <div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--gold)' }}>
                    {notification.task?.title || 'New Update'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-light)' }}>
                    {notification.message}
                </div>
            </div>
            <button
                onClick={() => setNotification(null)}
                style={{ background: 'none', border: 'none', color: 'var(--gray)', cursor: 'pointer', fontSize: '1rem' }}
            >
                ✕
            </button>
        </div>
    );
}
