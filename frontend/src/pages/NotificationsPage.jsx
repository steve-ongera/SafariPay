import { useState } from "react";
import { useToast } from "../App.jsx";

const NOTIFS = [
  {
    id: 1, unread: true, type: "receive",
    icon: "bi-arrow-down-left", color: "var(--teal)", bg: "var(--teal-glow)",
    title: "Money Received",
    text: "KSh 2,500 received from Wanjiku M.",
    time: "2 minutes ago",
    action: "View Transaction",
  },
  {
    id: 2, unread: true, type: "loan",
    icon: "bi-bank", color: "var(--gold)", bg: "var(--gold-subtle)",
    title: "Loan Approved",
    text: "Your micro-loan of KSh 10,000 has been approved and credited to your wallet.",
    time: "1 hour ago",
    action: "View Loan",
  },
  {
    id: 3, unread: true, type: "savings",
    icon: "bi-piggy-bank-fill", color: "var(--purple)", bg: "var(--purple-glow)",
    title: "Auto-Save Completed",
    text: "KSh 500 was automatically deposited to your \"Emergency Fund\" goal. You're 42% there!",
    time: "6 hours ago",
    action: "View Goal",
  },
  {
    id: 4, unread: false, type: "security",
    icon: "bi-shield-check", color: "var(--green)", bg: "var(--green-glow)",
    title: "New Login Detected",
    text: "A new login was detected from Nairobi, Kenya. If this wasn't you, change your password immediately.",
    time: "Yesterday, 9:41 PM",
    action: "Secure Account",
  },
  {
    id: 5, unread: false, type: "promo",
    icon: "bi-star-fill", color: "var(--gold)", bg: "var(--gold-subtle)",
    title: "Upgrade to Premium",
    text: "Unlock higher loan limits, lower fees, and priority support. Upgrade your SafariPay account today.",
    time: "2 days ago",
    action: "Learn More",
  },
  {
    id: 6, unread: false, type: "send",
    icon: "bi-arrow-up-right", color: "var(--coral)", bg: "var(--coral-glow)",
    title: "Transfer Successful",
    text: "KSh 3,000 sent to Osei Kwame successfully. Transaction ID: TXN4AC72D49E1F…",
    time: "3 days ago",
    action: "View Receipt",
  },
  {
    id: 7, unread: false, type: "rate",
    icon: "bi-currency-exchange", color: "var(--teal)", bg: "var(--teal-glow)",
    title: "FX Rate Alert",
    text: "USD/KES is at 129.45 — a 2-week high. Good time to exchange if you're holding dollars.",
    time: "4 days ago",
    action: "Exchange Now",
  },
  {
    id: 8, unread: false, type: "repay",
    icon: "bi-calendar-check", color: "var(--amber)", bg: "rgba(251,146,60,0.12)",
    title: "Loan Repayment Reminder",
    text: "Your loan of KSh 10,000 is due in 7 days. Make a repayment now to avoid late fees.",
    time: "5 days ago",
    action: "Repay Now",
  },
];

const FILTER_TYPES = [
  { key: "all",      label: "All" },
  { key: "receive",  label: "Received" },
  { key: "send",     label: "Sent" },
  { key: "loan",     label: "Loans" },
  { key: "savings",  label: "Savings" },
  { key: "security", label: "Security" },
];

export default function NotificationsPage() {
  const toast  = useToast();
  const [notifs,  setNotifs]  = useState(NOTIFS);
  const [filter,  setFilter]  = useState("all");

  const unreadCount = notifs.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifs(prev => prev.map(n => ({ ...n, unread: false })));
    toast("All notifications marked as read", "success");
  };

  const markRead = (id) => {
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, unread: false } : n));
  };

  const deleteNotif = (id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  };

  const visible = filter === "all" ? notifs : notifs.filter(n => n.type === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 640 }}>
      {/* Header */}
      <div className="animate-in" style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 26, marginBottom: 4 }}>
            Notifications
            {unreadCount > 0 && (
              <span style={{
                marginLeft: 10, fontSize: 14,
                background: "var(--coral)", color: "#fff",
                borderRadius: "var(--r-full)", padding: "2px 9px",
                fontFamily: "var(--font-body)", fontWeight: 700,
              }}>{unreadCount}</span>
            )}
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Stay on top of your financial activity
          </p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline btn-sm" onClick={markAllRead}>
            <i className="bi bi-check2-all" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter chips */}
      <div className="filter-chips animate-in stagger-1">
        {FILTER_TYPES.map(f => (
          <button
            key={f.key}
            className={`chip ${filter === f.key ? "active" : ""}`}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
            {f.key !== "all" && (
              <span style={{
                marginLeft: 4, fontSize: 10, fontWeight: 700,
                color: "var(--text-muted)",
              }}>
                {notifs.filter(n => n.type === f.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="card animate-in stagger-2" style={{ padding: 0, overflow: "hidden" }}>
        {visible.length === 0 ? (
          <div className="empty-state">
            <i className="bi bi-bell-slash empty-icon" />
            <div className="empty-title">All caught up!</div>
            <p className="empty-text">No notifications in this category.</p>
          </div>
        ) : (
          visible.map((n, idx) => (
            <div
              key={n.id}
              className={`notif-item ${n.unread ? "unread" : ""}`}
              onClick={() => markRead(n.id)}
            >
              {/* Unread dot */}
              {n.unread && <div className="notif-dot" />}

              {/* Icon */}
              <div className="notif-icon" style={{ background: n.bg, color: n.color }}>
                <i className={`bi ${n.icon}`} />
              </div>

              {/* Body */}
              <div className="notif-body">
                <div className="notif-title" style={{ fontWeight: n.unread ? 700 : 500 }}>
                  {n.title}
                </div>
                <div className="notif-text">{n.text}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
                  <span className="notif-time">{n.time}</span>
                  {n.action && (
                    <button
                      className="btn btn-ghost btn-xs"
                      style={{ padding: "2px 6px", color: "var(--teal)", fontSize: 11 }}
                      onClick={e => { e.stopPropagation(); toast(`"${n.action}" — coming soon!`, "info"); }}
                    >
                      {n.action} →
                    </button>
                  )}
                </div>
              </div>

              {/* Delete */}
              <button
                className="btn btn-ghost btn-xs"
                style={{ flexShrink: 0, color: "var(--text-muted)", padding: "4px" }}
                onClick={e => { e.stopPropagation(); deleteNotif(n.id); }}
                title="Dismiss"
              >
                <i className="bi bi-x" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Settings teaser */}
      <div className="card card-teal animate-in stagger-3" style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: "var(--teal-glow)", display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--teal)", fontSize: 20,
        }}>
          <i className="bi bi-bell-fill" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>Notification Preferences</div>
          <div style={{ color: "var(--text-secondary)", fontSize: 13 }}>
            Choose which alerts you receive — push, SMS, or email.
          </div>
        </div>
        <button
          className="btn btn-teal btn-sm"
          style={{ flexShrink: 0 }}
          onClick={() => toast("Notification settings coming soon!", "info")}
        >
          Configure
        </button>
      </div>
    </div>
  );
}