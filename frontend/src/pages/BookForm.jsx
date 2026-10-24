import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { bookAPI } from "../services/api";
import BookCover from "../components/BookCover";
import Segmented from "../components/Segmented";
import { UploadIcon } from "../components/Icons";
import { useToast } from "../context/ToastContext";
import { errorMessage } from "../utils/errors";

const CONDITIONS = ["New", "Like new", "Good", "Fair", "Heavily used"];
const SUBJECTS = [
  "Engineering Mathematics", "Engineering Physics", "Engineering Chemistry", "Data Structures",
  "Database Management Systems", "Operating Systems", "Computer Networks", "Digital Logic",
  "Microprocessors", "Software Engineering", "Java Programming", "Machine Learning",
];
const EMPTY = {
  title: "", author: "", subject: "", course: "", edition: "",
  condition: "Good", type: "SELL", price: "", description: "",
};
const MAX_IMAGE = 5 * 1024 * 1024; // matches the backend upload limit

// One form for both "List a book" and "Edit listing"
export default function BookForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useSelector((s) => s.auth);

  const [form, setForm] = useState(EMPTY);
  const [existingImage, setExistingImage] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const fileInput = useRef(null);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    bookAPI
      .getById(id)
      .then((res) => {
        if (!active) return;
        const b = res.data;
        if (user && b.sellerId !== user.id) {
          toast.error("You can only edit your own listings.");
          navigate("/my-books", { replace: true });
          return;
        }
        setForm({
          title: b.title || "",
          author: b.author || "",
          subject: b.subject || "",
          course: b.course || "",
          edition: b.edition || "",
          condition: b.condition || "Good",
          type: b.type || "SELL",
          price: b.price ?? "",
          description: b.description || "",
        });
        setExistingImage(b.imageUrl || null);
        setLoading(false);
      })
      .catch(() => {
        toast.error("Couldn't load that listing.");
        navigate("/my-books", { replace: true });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, editing]);

  // Local preview of a freshly chosen photo
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const set = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const chooseFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Choose an image file (JPG, PNG or WebP).");
      return;
    }
    if (f.size > MAX_IMAGE) {
      toast.error("That image is over 5 MB. Choose a smaller one.");
      return;
    }
    setFile(f);
  };

  const valid = form.title.trim() && (form.type === "SWAP" || Number(form.price) > 0);

  const submit = async (e) => {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    try {
      let imageUrl = existingImage;
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        const up = await bookAPI.uploadImage(fd);
        imageUrl = up.data.imageUrl;
      }
      const payload = {
        ...form,
        title: form.title.trim(),
        price: form.type === "SELL" ? Number(form.price) : null,
        imageUrl,
      };
      if (editing) await bookAPI.update(id, payload);
      else await bookAPI.create(payload);
      toast.success(editing ? "Changes saved." : "Listing published.");
      navigate("/my-books");
    } catch (err) {
      toast.error(errorMessage(err, "Couldn't save the listing. Try again."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="py-10 text-slate2">Loading listing…</p>;

  const previewBook = {
    title: form.title.trim() || "Your title here",
    author: form.author,
    subject: form.subject,
    course: form.course,
    imageUrl: existingImage,
  };

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_280px]">
      <form onSubmit={submit} className="max-w-xl space-y-5">
        <h1 className="text-3xl font-semibold">{editing ? "Edit listing" : "List a book"}</h1>

        <div>
          <label htmlFor="title" className="label">Title</label>
          <input id="title" name="title" value={form.title} onChange={set} required className="field" autoFocus />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="author" className="label">Author</label>
            <input id="author" name="author" value={form.author} onChange={set} className="field" />
          </div>
          <div>
            <label htmlFor="edition" className="label">Edition</label>
            <input id="edition" name="edition" value={form.edition} onChange={set} placeholder="e.g. 3rd" className="field" />
          </div>
          <div>
            <label htmlFor="subject" className="label">Subject</label>
            <input id="subject" name="subject" value={form.subject} onChange={set} list="subject-options" className="field" />
            <datalist id="subject-options">
              {SUBJECTS.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="course" className="label">Course code</label>
            <input id="course" name="course" value={form.course} onChange={set} placeholder="e.g. CS301" className="field" />
          </div>
        </div>

        <div>
          <span className="label">Condition</span>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Condition">
            {CONDITIONS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={form.condition === c}
                onClick={() => setForm((f) => ({ ...f, condition: c }))}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  form.condition === c ? "border-stamp bg-stamp-soft text-stamp-dark" : "border-rule bg-white hover:border-slate2/50"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <span className="label">You want to</span>
            <Segmented
              label="Listing type"
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v }))}
              options={[{ value: "SELL", label: "Sell" }, { value: "SWAP", label: "Swap" }]}
            />
          </div>
          {form.type === "SELL" && (
            <div className="w-40">
              <label htmlFor="price" className="label">Price</label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate2">₹</span>
                <input id="price" name="price" type="number" min="1" inputMode="numeric" value={form.price} onChange={set} className="field pl-7" />
              </div>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="description" className="label">Description</label>
          <textarea
            id="description" name="description" rows={4} maxLength={1000} value={form.description} onChange={set}
            placeholder="Highlights, notes, anything the next owner should know" className="field"
          />
          <p className="mt-1 text-right text-xs text-slate2">{form.description.length}/1000</p>
        </div>

        <div>
          <span className="label">Photo</span>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); chooseFile(e.dataTransfer.files[0]); }}
            className={`flex flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragging ? "border-stamp bg-stamp-soft" : "border-rule bg-white"
            }`}
          >
            <UploadIcon className="text-slate2" />
            <p className="text-sm">
              {file ? file.name : "Drop a photo here, or"}{" "}
              <button type="button" onClick={() => fileInput.current?.click()} className="font-medium text-stamp hover:underline">
                {file || existingImage ? "choose a different one" : "browse files"}
              </button>
            </p>
            {file && (
              <button type="button" onClick={() => setFile(null)} className="text-xs text-slate2 hover:text-ink">
                Remove new photo
              </button>
            )}
            <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => chooseFile(e.target.files[0])} />
          </div>
          <p className="mt-1 text-xs text-slate2">Without a photo, a cover is generated from your title.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={!valid || saving} className="btn-primary px-5 py-2.5">
            {saving ? "Saving…" : editing ? "Save changes" : "Publish listing"}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost px-5 py-2.5">Cancel</button>
        </div>
      </form>

      <aside className="self-start lg:sticky lg:top-24">
        <p className="mb-2 text-sm text-slate2">How buyers will see it</p>
        <div className="max-w-[240px]">
          <BookCover book={previewBook} size="md" src={preview} />
        </div>
        <p className="mt-3 text-sm font-semibold">
          {form.type === "SELL" ? (Number(form.price) > 0 ? `₹${form.price}` : "Add a price") : "Swap"}
        </p>
      </aside>
    </div>
  );
}
