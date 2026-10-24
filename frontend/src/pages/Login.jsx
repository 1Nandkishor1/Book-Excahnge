import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearError, login } from "../redux/authSlice";
import { EyeIcon, EyeOffIcon } from "../components/Icons";

export default function Login() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, token } = useSelector((s) => s.auth);

  // Send people back to the page that asked them to log in
  const from = location.state?.from ? `${location.state.from.pathname}${location.state.from.search || ""}` : "/";

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (token) navigate(from, { replace: true });
  }, [token, from, navigate]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    dispatch(login(form));
  };

  return (
    <div className="mx-auto max-w-sm py-8">
      <h1 className="text-3xl font-semibold">Welcome back</h1>
      <p className="mt-2 text-slate2">Log in to make offers and reply to buyers.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" autoComplete="email" value={form.email} onChange={set} required className="field" autoFocus />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input
              id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password"
              value={form.password} onChange={set} required className="field pr-10"
            />
            <button
              type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-slate2 hover:text-ink"
            >
              {show ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
            </button>
          </div>
        </div>

        {error && <p role="alert" className="text-sm text-brick">{error}</p>}

        <button type="submit" disabled={status === "loading"} className="btn-primary w-full py-2.5">
          {status === "loading" ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate2">
        New here? <Link to="/register" className="font-medium text-stamp hover:underline">Create an account</Link>
      </p>
    </div>
  );
}
