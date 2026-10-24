import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../redux/authSlice";
import { offerAPI } from "../services/api";
import { ChevronDownIcon, MenuIcon, XIcon } from "./Icons";

const linkClass = ({ isActive }) =>
  `rounded-md px-2 py-1 text-sm font-medium transition-colors ${isActive ? "text-stamp" : "text-slate2 hover:text-ink"}`;

export default function Navbar() {
  const { user } = useSelector((s) => s.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  // Count offers waiting for the seller's reply; refreshed on every page change
  useEffect(() => {
    if (!user) {
      setPending(0);
      return;
    }
    let cancelled = false;
    offerAPI
      .getReceived()
      .then((res) => {
        if (!cancelled) setPending(res.data.filter((o) => o.status === "PENDING").length);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, location.pathname]);

  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  const handleLogout = () => {
    dispatch(logout());
    navigate("/login");
  };

  const links = (
    <>
      <NavLink to="/" end className={linkClass}>Browse</NavLink>
      {user && (
        <>
          <NavLink to="/my-books" className={linkClass}>My listings</NavLink>
          <NavLink to="/offers" className={linkClass}>
            Offers
            {pending > 0 && (
              <span className="ml-1.5 rounded-full bg-stamp px-1.5 py-0.5 text-xs font-semibold text-white" aria-label={`${pending} waiting for your reply`}>
                {pending}
              </span>
            )}
          </NavLink>
        </>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-30 border-b border-rule bg-paper/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-6">
          <Link to="/" className="font-serif text-lg font-bold">Campus Book Exchange</Link>
          <div className="hidden items-center gap-2 md:flex">{links}</div>
        </div>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link to="/add-book" className="btn-primary hidden sm:inline-flex">Sell a book</Link>
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((o) => !o)}
                  aria-haspopup="menu"
                  aria-expanded={menuOpen}
                  className="flex items-center gap-2 rounded-full border border-rule bg-white py-1 pl-1 pr-2 text-sm"
                >
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-stamp text-xs font-semibold text-white">
                    {user.fullName?.charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden max-w-[8rem] truncate sm:block">{user.fullName}</span>
                  <ChevronDownIcon width={14} height={14} />
                </button>
                {menuOpen && (
                  <div role="menu" className="absolute right-0 mt-2 w-44 animate-fade rounded-lg border border-rule bg-white py-1 shadow-lg">
                    <Link role="menuitem" to="/profile" className="block px-3 py-2 text-sm hover:bg-paper">Profile</Link>
                    <button role="menuitem" type="button" onClick={handleLogout} className="block w-full px-3 py-2 text-left text-sm text-brick hover:bg-paper">
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost">Log in</Link>
              <Link to="/register" className="btn-primary hidden sm:inline-flex">Create account</Link>
            </>
          )}
          <button
            type="button"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            className="grid h-9 w-9 place-items-center rounded-lg border border-rule bg-white md:hidden"
          >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="flex animate-fade flex-col gap-1 border-t border-rule px-4 py-3 md:hidden">
          {links}
          {user && <NavLink to="/add-book" className={linkClass}>Sell a book</NavLink>}
        </div>
      )}
    </header>
  );
}
