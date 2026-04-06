import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { auth as authApi, loadTokens, clearTokens, isAuthenticated } from "./services/api.js";

// ── Auth Context ──────────────────────────────────────────────────────────
export const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

// ── Toast Context ─────────────────────────────────────────────────────────
export const ToastCtx = createContext(null);
export const useToast = () => useContext(ToastCtx);

// ── Page imports ──────────────────────────────────────────────────────────
import Login             from "./pages/Login.jsx";
import Register          from "./pages/Register.jsx";
import Dashboard         from "./pages/Dashboard.jsx";
import WalletsPage       from "./pages/WalletsPage.jsx";
import SendPage          from "./pages/SendPage.jsx";
import TransactionsPage  from "./pages/TransactionsPage.jsx";
import AnalyticsPage     from "./pages/AnalyticsPage.jsx";
import LoansPage         from "./pages/LoansPage.jsx";
import SavingsPage       from "./pages/SavingsPage.jsx";
import ExchangePage      from "./pages/ExchangePage.jsx";
import NotificationsPage from "./pages/NotificationsPage.jsx";
import ProfilePage       from "./pages/ProfilePage.jsx";

// ── Nav groups ────────────────────────────────────────────────────────────
const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      { key: "dashboard",     label: "Dashboard",     icon: "bi-grid-fill" },
      { key: "analytics",     label: "Analytics",     icon: "bi-bar-chart-line-fill" },
      { key: "notifications", label: "Notifications", icon: "bi-bell-fill", badge: 3 },
    ],
  },
  {
    label: "Money",
    items: [
      { key: "wallets",       label: "Wallets",       icon: "bi-wallet2" },
      { key: "send",          label: "Send Money",    icon: "bi-send-fill" },
      { key: "transactions",  label: "Transactions",  icon: "bi-arrow-left-right" },
      { key: "exchange",      label: "FX Exchange",   icon: "bi-currency-exchange" },
    ],
  },
  {
    label: "Finance",
    items: [
      { key: "loans",         label: "Micro-Loans",   icon: "bi-bank" },
      { key: "savings",       label: "Savings Goals", icon: "bi-piggy-bank-fill" },
    ],
  },
  {
    label: "Account",
    items: [
      { key: "profile",       label: "Profile",       icon: "bi-person-circle" },
    ],
  },
];

const PAGES = {
  dashboard:     Dashboard,
  wallets:       WalletsPage,
  send:          SendPage,
  transactions:  TransactionsPage,
  analytics:     AnalyticsPage,
  loans:         LoansPage,
  savings:       SavingsPage,
  exchange:      ExchangePage,
  notifications: NotificationsPage,
  profile:       ProfilePage,
};

// ── Toast container ───────────────────────────────────────────────────────
function ToastContainer({ toasts, remove }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          <i className={`bi ${
            t.type === "success" ? "bi-check-circle-fill" :
            t.type === "error"   ? "bi-exclamation-triangle-fill" :
            t.type === "warning" ? "bi-exclamation-circle-fill" :
            "bi-info-circle-fill"
          } toast-icon`} />
          <span className="toast-msg">{t.message}</span>
          <button className="toast-close" onClick={() => remove(t.id)}>
            <i className="bi bi-x-lg" />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [user,     setUser]    = useState(null);
  const [page,     setPage]    = useState("dashboard");
  const [authed,   setAuthed]  = useState(false);
  const [authView, setAuthView]= useState("login");
  const [loading,  setLoading] = useState(true);
  const [sideOpen, setSideOpen]= useState(false);
  const [toasts,   setToasts]  = useState([]);

  const toast = useCallback((message, type = "info", duration = 4000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration);
  }, []);

  const removeToast = useCallback(id =>
    setToasts(prev => prev.filter(t => t.id !== id)), []);

  useEffect(() => {
    loadTokens();
    if (isAuthenticated()) {
      authApi.me()
        .then(u => { setUser(u); setAuthed(true); })
        .catch(() => clearTokens())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
    const onLogout = () => { setUser(null); setAuthed(false); setAuthView("login"); };
    window.addEventListener("sp:logout", onLogout);
    return () => window.removeEventListener("sp:logout", onLogout);
  }, []);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") setSideOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const login    = userData => { setUser(userData); setAuthed(true); };
  const logout   = async () => {
    await authApi.logout().catch(() => {});
    setUser(null); setAuthed(false);
    toast("Signed out successfully", "info");
  };
  const navigate = key => { setPage(key); setSideOpen(false); };

  if (loading) return <Splash />;

  if (!authed) {
    return (
      <ToastCtx.Provider value={toast}>
        <AuthCtx.Provider value={{ user, login, logout, navigate }}>
          {authView === "login"
            ? <Login    onSwitch={() => setAuthView("register")} />
            : <Register onSwitch={() => setAuthView("login")} />}
          <ToastContainer toasts={toasts} remove={removeToast} />
        </AuthCtx.Provider>
      </ToastCtx.Provider>
    );
  }

  const CurrentPage = PAGES[page] || Dashboard;
  const currentNav  = NAV_GROUPS.flatMap(g => g.items).find(n => n.key === page);

  return (
    <ToastCtx.Provider value={toast}>
      <AuthCtx.Provider value={{ user, login, logout, navigate }}>
        <div className="page-shell">

          {/* Mobile overlay */}
          {sideOpen && <div className="sidebar-overlay" onClick={() => setSideOpen(false)} />}

          {/* ── Sidebar ── */}
          <aside className={`sidebar ${sideOpen ? "open" : ""}`}>
            <div className="sidebar-logo">
              <div className="logo-icon">S</div>
              <span className="logo-wordmark">
                Safari<span className="logo-accent">Pay</span>
              </span>
            </div>

            <nav className="sidebar-nav">
              {NAV_GROUPS.map(group => (
                <div key={group.label} className="nav-group">
                  <span className="nav-group-label">{group.label}</span>
                  {group.items.map(n => (
                    <button
                      key={n.key}
                      onClick={() => navigate(n.key)}
                      className={`nav-item ${page === n.key ? "active" : ""}`}
                    >
                      <i className={`bi ${n.icon} nav-icon`} />
                      <span className="nav-label">{n.label}</span>
                      {n.badge && <span className="nav-badge">{n.badge}</span>}
                    </button>
                  ))}
                </div>
              ))}
            </nav>

            <div className="sidebar-footer">
              <div className="sidebar-user">
                <div className="sidebar-avatar">
                  {(user?.display_name || user?.name || "U")[0].toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">
                    {(user?.display_name || user?.name || "User").split(" ")[0]}
                  </div>
                  <div className="sidebar-user-tier">{user?.tier || "Basic"}</div>
                </div>
                <button
                  className="btn btn-ghost btn-sm sidebar-settings-btn"
                  onClick={() => navigate("profile")}
                >
                  <i className="bi bi-gear" />
                </button>
              </div>
              <button onClick={logout} className="btn btn-outline btn-sm sidebar-logout">
                <i className="bi bi-box-arrow-right" /> Sign Out
              </button>
            </div>
          </aside>

          {/* ── Main wrapper ── */}
          <div className="main-wrapper">
            {/* Top bar */}
            <header className="topbar">
              <div className="topbar-left">
                <button className="topbar-hamburger" onClick={() => setSideOpen(s => !s)}>
                  <i className={`bi ${sideOpen ? "bi-x-lg" : "bi-list"}`} />
                </button>
                <div className="topbar-breadcrumb">
                  {currentNav && <>
                    <i className={`bi ${currentNav.icon}`} style={{ color: "var(--gold)" }} />
                    <span>{currentNav.label}</span>
                  </>}
                </div>
              </div>
              <div className="topbar-right">
                <button className="topbar-icon-btn" onClick={() => navigate("notifications")} title="Notifications">
                  <i className="bi bi-bell" />
                  <span className="topbar-badge" />
                </button>
                <button className="topbar-icon-btn topbar-send-btn" onClick={() => navigate("send")} title="Quick Send">
                  <i className="bi bi-send-fill" />
                  <span>Send</span>
                </button>
                <div className="topbar-avatar" onClick={() => navigate("profile")} title="Profile">
                  {(user?.display_name || user?.name || "U")[0].toUpperCase()}
                </div>
              </div>
            </header>

            <main className="main-content">
              <CurrentPage />
            </main>
          </div>
        </div>

        <ToastContainer toasts={toasts} remove={removeToast} />
      </AuthCtx.Provider>
    </ToastCtx.Provider>
  );
}

function Splash() {
  return (
    <div className="splash-screen">
      <div className="splash-logo">S</div>
      <div className="splash-dots">
        <span /><span /><span />
      </div>
    </div>
  );
}