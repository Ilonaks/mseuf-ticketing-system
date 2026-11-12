import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import { useDialog } from "../context/DialogContext";
import Field from "../components/Field";
import { errorMessage, posterSrc, toLocalInput } from "../utils/format";
import { serverFieldErrors, validateEvent, validatePosterFile } from "../utils/validation";

const emptyForm = {
  title: "",
  description: "",
  venue: "",
  start_at: "",
  end_at: "",
  capacity: 100,
  price: 0,
  status: "draft",
  category_id: "",
};

// Create (/events/new) and edit (/events/:id/edit) share this form
export default function EventForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { confirm, toast } = useDialog();

  const [form, setForm] = useState(emptyForm);
  const [original, setOriginal] = useState(emptyForm); // to detect unsaved changes
  const [ticketsIssued, setTicketsIssued] = useState(0);
  const [loading, setLoading] = useState(isEdit);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [categories, setCategories] = useState([]);
  const [existingPoster, setExistingPoster] = useState(null); // URL of the saved poster
  const [posterFile, setPosterFile] = useState(null); // new file chosen in this form
  const [posterPreview, setPosterPreview] = useState(null);
  const [removePoster, setRemovePoster] = useState(false);

  useEffect(() => {
    api.get("/categories").then((res) => setCategories(res.data)).catch(() => {});
  }, []);

  // Free the preview's memory when it is replaced
  useEffect(() => () => posterPreview && URL.revokeObjectURL(posterPreview), [posterPreview]);

  useEffect(() => {
    if (!isEdit) return;
    api
      .get(`/events/${id}`)
      .then((res) => {
        const e = res.data;
        const loaded = {
          title: e.title,
          description: e.description ?? "",
          venue: e.venue,
          start_at: toLocalInput(e.start_at),
          end_at: toLocalInput(e.end_at),
          capacity: e.capacity,
          price: Number(e.price),
          status: e.status,
          category_id: e.category_id ? String(e.category_id) : "",
        };
        setExistingPoster(posterSrc(e));
        setForm(loaded);
        setOriginal(loaded);
        setTicketsIssued(e.tickets_count);
      })
      .catch((err) => setFormError(errorMessage(err, "Could not load the event.")))
      .finally(() => setLoading(false));
  }, [id, isEdit]);

  const isDirty = JSON.stringify(form) !== JSON.stringify(original) || Boolean(posterFile) || removePoster;

  // Warn before closing the tab with unsaved changes
  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (errors[e.target.name]) setErrors({ ...errors, [e.target.name]: undefined });
  };

  const choosePoster = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // lets the same file be picked again after an error
    if (!file) return;

    const problem = await validatePosterFile(file);
    if (problem) {
      setErrors({ ...errors, poster: problem });
      return;
    }
    setErrors({ ...errors, poster: undefined });
    setPosterFile(file);
    setPosterPreview(URL.createObjectURL(file));
    setRemovePoster(false);
  };

  const dropPoster = async () => {
    if (posterFile) {
      setPosterFile(null);
      setPosterPreview(null);
      return;
    }
    const ok = await confirm({
      title: "Remove the poster?",
      message: "The event will show its initials instead. This happens when you save.",
      confirmText: "Remove",
      tone: "danger",
    });
    if (ok) setRemovePoster(true);
  };

  // Uploads or removes the poster after the event itself is saved
  const syncPoster = async (eventId) => {
    try {
      if (posterFile) {
        const data = new FormData();
        data.append("poster", posterFile);
        await api.post(`/events/${eventId}/poster`, data);
      } else if (removePoster) {
        await api.delete(`/events/${eventId}/poster`);
      }
      return true;
    } catch (err) {
      toast(`Event saved, but the poster failed: ${errorMessage(err)}`, "error");
      return false;
    }
  };

  const goBack = async () => {
    if (isDirty) {
      const ok = await confirm({
        title: "Discard changes?",
        message: "You have unsaved changes to this event. They will be lost.",
        confirmText: "Discard",
        cancelText: "Keep editing",
        tone: "danger",
      });
      if (!ok) return;
    }
    navigate(-1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");

    const found = validateEvent(form, { isEdit, minCapacity: ticketsIssued });
    setErrors(found);
    if (Object.keys(found).length) {
      setFormError("Please fix the highlighted fields.");
      return;
    }

    // Status changes affect students, so confirm them
    if (form.status !== original.status || (!isEdit && form.status === "published")) {
      const messages = {
        published: "Students will be able to see this event and reserve tickets.",
        draft: "The event will be hidden from students.",
        cancelled: "Students can no longer reserve tickets. Existing tickets stay but the event shows as cancelled.",
      };
      const ok = await confirm({
        title: isEdit ? `Change status to ${form.status}?` : `Create as ${form.status}?`,
        message: messages[form.status],
        confirmText: isEdit ? "Save changes" : "Create event",
        tone: form.status === "cancelled" ? "danger" : "primary",
      });
      if (!ok) return;
    }

    setSubmitting(true);

    // datetime-local values are local time; send them with the timezone attached
    const payload = {
      ...form,
      title: form.title.trim(),
      venue: form.venue.trim(),
      category_id: form.category_id ? Number(form.category_id) : null,
      start_at: new Date(form.start_at).toISOString(),
      end_at: new Date(form.end_at).toISOString(),
    };

    try {
      if (isEdit) {
        await api.put(`/events/${id}`, payload);
        setOriginal(form);
        const posterOk = await syncPoster(id);
        setPosterFile(null);
        setRemovePoster(false);
        if (posterOk) toast("Event updated.");
        navigate(`/events/${id}`);
      } else {
        const res = await api.post("/events", payload);
        setOriginal(form);
        const posterOk = await syncPoster(res.data.event.id);
        setPosterFile(null);
        if (posterOk) toast("Event created.");
        navigate(`/events/${res.data.event.id}`);
      }
    } catch (err) {
      const fieldErrors = serverFieldErrors(err);
      if (fieldErrors) {
        setErrors(fieldErrors);
        setFormError("Please fix the highlighted fields.");
      } else {
        setFormError(errorMessage(err, "Could not save the event."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <p className="center">Loading event...</p>;

  return (
    <form className="card form-card" onSubmit={handleSubmit} noValidate>
      <h2 className="page-title">{isEdit ? "Edit Event" : "New Event"}</h2>
      {isEdit && ticketsIssued > 0 && (
        <p className="muted">{ticketsIssued} ticket(s) already issued — capacity can't go below that.</p>
      )}

      {formError && <div className="error">{formError}</div>}

      <Field label="Title" htmlFor="title" error={errors.title}>
        <input id="title" name="title" maxLength={150} value={form.title} onChange={handleChange} />
      </Field>

      <Field label={`Description (${form.description.length}/2000)`} htmlFor="description" error={errors.description}>
        <textarea
          id="description"
          name="description"
          rows={3}
          maxLength={2000}
          value={form.description}
          onChange={handleChange}
        />
      </Field>

      <div className="field-row">
        <Field label="Category" htmlFor="category_id" error={errors.category_id}>
          <select id="category_id" name="category_id" value={form.category_id} onChange={handleChange}>
            <option value="">No category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <div />
      </div>

      <Field label="Poster (JPG, PNG, or WebP · up to 3 MB · at least 300×200)" htmlFor="poster" error={errors.poster}>
        <div className="poster-field">
          {posterPreview || (existingPoster && !removePoster) ? (
            <img src={posterPreview || existingPoster} alt="Poster preview" className="poster-preview" />
          ) : (
            <div className="poster-preview poster-empty">No poster</div>
          )}
          <div className="poster-actions">
            <label className="chip-btn poster-pick">
              {posterPreview || (existingPoster && !removePoster) ? "Change image" : "Choose image"}
              <input id="poster" type="file" accept="image/jpeg,image/png,image/webp" onChange={choosePoster} hidden />
            </label>
            {(posterPreview || (existingPoster && !removePoster)) && (
              <button type="button" className="chip-btn chip-danger" onClick={dropPoster}>
                Remove
              </button>
            )}
            {posterFile && <small className="muted">New poster uploads when you save.</small>}
            {removePoster && <small className="muted">Poster will be removed when you save.</small>}
          </div>
        </div>
      </Field>

      <Field label="Venue" htmlFor="venue" error={errors.venue}>
        <input id="venue" name="venue" maxLength={150} value={form.venue} onChange={handleChange} />
      </Field>

      <div className="field-row">
        <Field label="Starts" htmlFor="start_at" error={errors.start_at}>
          <input
            id="start_at"
            type="datetime-local"
            name="start_at"
            min={isEdit ? undefined : toLocalInput(new Date())}
            value={form.start_at}
            onChange={handleChange}
          />
        </Field>

        <Field label="Ends" htmlFor="end_at" error={errors.end_at}>
          <input
            id="end_at"
            type="datetime-local"
            name="end_at"
            min={form.start_at || undefined}
            value={form.end_at}
            onChange={handleChange}
          />
        </Field>
      </div>

      <div className="field-row">
        <Field label="Capacity" htmlFor="capacity" error={errors.capacity}>
          <input
            id="capacity"
            type="number"
            min={Math.max(1, ticketsIssued)}
            max={100000}
            step="1"
            name="capacity"
            value={form.capacity}
            onChange={handleChange}
          />
        </Field>

        <Field label="Price (₱, 0 = free)" htmlFor="price" error={errors.price}>
          <input
            id="price"
            type="number"
            min="0"
            max="100000"
            step="0.01"
            name="price"
            value={form.price}
            onChange={handleChange}
          />
        </Field>
      </div>

      <Field label="Status" htmlFor="status" error={errors.status}>
        <select id="status" name="status" value={form.status} onChange={handleChange}>
          <option value="draft">Draft (hidden from students)</option>
          <option value="published">Published</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </Field>

      <div className="actions">
        <button type="submit" disabled={submitting}>
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Event"}
        </button>
        <button type="button" className="btn-ghost" onClick={goBack}>
          Back
        </button>
      </div>
    </form>
  );
}
