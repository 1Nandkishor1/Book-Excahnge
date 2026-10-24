import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearError, register } from "../redux/authSlice";
import { EyeIcon, EyeOffIcon } from "../components/Icons";

export default function Register() {
  const [form, setForm] = useState({ fullName: "", email: "", password: "", phone: "", college: "", department: "" });
  const [show, setShow] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { status, error, token } = useSelector((s) => s.auth);
  const from = location.state?.from ? `${location.state.from.pathname}${location.state.from.search || ""}` : "/";

  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  useEffect(() => {
    if (token) navigate(from, { replace: true });
  }, [token, from, navigate]);

  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const longEnough = form.password.length >= 6;

  const submit = (e) => {
    e.preventDefault();
    dispatch(register(form));
  };

  return (
    <div className="mx-auto max-w-md py-8">
      <h1 className="text-3xl font-semibold">Create your account</h1>
      <p className="mt-2 text-slate2">It takes a minute. Your phone number stays private.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="fullName" className="label">Full name</label>
          <input id="fullName" name="fullName" value={form.fullName} onChange={set} required autoComplete="name" className="field" autoFocus />
        </div>
        <div>
          <label htmlFor="email" className="label">Email</label>
          <input id="email" name="email" type="email" value={form.email} onChange={set} required autoComplete="email" className="field" />
        </div>
        <div>
          <label htmlFor="password" className="label">Password</label>
          <div className="relative">
            <input
              id="password" name="password" type={show ? "text" : "password"} value={form.password} onChange={set}
              required minLength={6} autoComplete="new-password" className="field pr-10"
            />
            <button
              type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center text-slate2 hover:text-ink"
            >
              {show ? <EyeOffIcon width={16} height={16} /> : <EyeIcon width={16} height={16} />}
            </button>
          </div>
          <p className={`mt-1 text-xs ${longEnough ? "text-pine" : "text-slate2"}`}>
            {longEnough ? "Long enough" : "Use at least 6 characters"}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="college" className="label">College</label>
            <input id="college" name="college" value={form.college} onChange={set} className="field" />
          </div>
          <div>
            <label htmlFor="department" className="label">Department</label>
            <input id="department" name="department" value={form.department} onChange={set} className="field" />
          </div>
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone (optional)</label>
          <input id="phone" name="phone" type="tel" value={form.phone} onChange={set} autoComplete="tel" className="field" />
        </div>

        {error && <p role="alert" className="text-sm text-brick">{error}</p>}

        <button type="submit" disabled={status === "loading"} className="btn-primary w-full py-2.5">
          {status === "loading" ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate2">
        Already have an account? <Link to="/login" className="font-medium text-stamp hover:underline">Log in</Link>
      </p>
    </div>
  );
}
