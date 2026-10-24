import { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { userAPI } from "../services/api";
import { profileUpdated } from "../redux/authSlice";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/errors";

const FIELDS = ["fullName", "phone", "college", "department"];
const pick = (o) => FIELDS.map((k) => o?.[k] || "").join("|");

export default function Profile() {
  const toast = useToast();
  const dispatch = useDispatch();
  const [form, setForm] = useState(null);
  const [saved, setSaved] = useState(null); // last values stored on the server
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    userAPI
      .getProfile()
      .then((res) => {
        setForm(res.data);
        setSaved(res.data);
      })
      .catch((err) => toast.error(errorMessage(err, "Couldn't load your profile.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!form) return <p className="py-10 text-slate2">Loading profile…</p>;

  const dirty = pick(form) !== pick(saved);
  const set = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (!dirty || saving || !form.fullName.trim()) return;
    setSaving(true);
    try {
      const res = await userAPI.updateProfile(form);
      setForm(res.data);
      setSaved(res.data);
      dispatch(profileUpdated({ fullName: res.data.fullName }));
      toast.success("Profile saved.");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save your profile."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-4">
      <div className="flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-stamp text-xl font-semibold text-white">
          {form.fullName?.charAt(0).toUpperCase()}
        </span>
        <div>
          <h1 className="text-2xl font-semibold">{saved.fullName}</h1>
          <p className="text-sm text-slate2">{form.email}</p>
        </div>
      </div>

      <form onSubmit={submit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="fullName" className="label">Full name</label>
          <input id="fullName" name="fullName" value={form.fullName || ""} onChange={set} required className="field" />
        </div>
        <div>
          <label htmlFor="phone" className="label">Phone</label>
          <input id="phone" name="phone" type="tel" value={form.phone || ""} onChange={set} className="field" />
        </div>
        <div>
          <label htmlFor="college" className="label">College</label>
          <input id="college" name="college" value={form.college || ""} onChange={set} className="field" />
        </div>
        <div>
          <label htmlFor="department" className="label">Department</label>
          <input id="department" name="department" value={form.department || ""} onChange={set} className="field" />
        </div>
        <button type="submit" disabled={!dirty || saving} className="btn-primary px-5 py-2.5">
          {saving ? "Saving…" : "Save profile"}
        </button>
      </form>
    </div>
  );
}
