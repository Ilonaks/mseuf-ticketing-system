// Client-side checks that mirror the API rules, so users see problems before submitting.
// Each validator returns an object of { field: "message" }; empty means valid.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME = /^[\p{L}\s.'-]+$/u;
const STUDENT_ID = /^\d{4}-\d{5}$/;
export const TICKET_CODE = /^MSEUF-[A-Z0-9]{8}$/;

export const validateLogin = ({ email, password }) => {
  const errors = {};
  if (!email.trim()) errors.email = "Enter your email.";
  else if (!EMAIL.test(email.trim())) errors.email = "Enter a valid email address.";
  if (!password) errors.password = "Enter your password.";
  return errors;
};

export const validateRegister = (form) => {
  const errors = {};
  const name = form.name.trim();
  if (!name) errors.name = "Enter your full name.";
  else if (name.length < 2) errors.name = "Name is too short.";
  else if (!NAME.test(name)) errors.name = "Use letters, spaces, periods, apostrophes, or hyphens only.";

  if (!form.email.trim()) errors.email = "Enter your email.";
  else if (!EMAIL.test(form.email.trim())) errors.email = "Enter a valid email address.";

  if (form.student_id.trim() && !STUDENT_ID.test(form.student_id.trim()))
    errors.student_id = "Student ID must look like 2023-00001.";

  if (form.password.length < 8) errors.password = "Use at least 8 characters.";
  else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password))
    errors.password = "Include at least one letter and one number.";

  if (!form.password_confirmation) errors.password_confirmation = "Type your password again.";
  else if (form.password !== form.password_confirmation) errors.password_confirmation = "Passwords don't match.";
  return errors;
};

// `minCapacity` = tickets already issued (when editing)
export const validateEvent = (form, { isEdit, minCapacity = 1 }) => {
  const errors = {};
  if (form.title.trim().length < 3) errors.title = "Title needs at least 3 characters.";
  else if (form.title.length > 150) errors.title = "Title is too long (150 max).";

  if (form.description.length > 2000) errors.description = "Description is too long (2000 max).";

  if (form.venue.trim().length < 2) errors.venue = "Enter the venue.";

  const start = form.start_at ? new Date(form.start_at) : null;
  const end = form.end_at ? new Date(form.end_at) : null;
  if (!start) errors.start_at = "Pick a start date and time.";
  else if (!isEdit && start <= new Date()) errors.start_at = "The event must start in the future.";
  if (!end) errors.end_at = "Pick an end date and time.";
  else if (start && end <= start) errors.end_at = "The end must be after the start.";

  const capacity = Number(form.capacity);
  if (!Number.isInteger(capacity) || capacity < 1) errors.capacity = "Capacity must be a whole number of at least 1.";
  else if (capacity < minCapacity) errors.capacity = `${minCapacity} tickets are already issued; capacity can't be lower.`;
  else if (capacity > 100000) errors.capacity = "Capacity is too large (100,000 max).";

  const price = Number(form.price);
  if (form.price === "" || Number.isNaN(price) || price < 0) errors.price = "Price must be 0 or more.";
  else if (price > 100000) errors.price = "Price is too high (₱100,000 max).";
  return errors;
};

// Checks a poster before upload (same limits as the API). Resolves to an error message or null.
export const validatePosterFile = (file) =>
  new Promise((resolve) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      resolve("The poster must be a JPG, PNG, or WebP image.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      resolve("The poster must be 3 MB or smaller.");
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img.width < 300 || img.height < 200 ? "The poster must be at least 300×200 pixels." : null);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve("That file couldn't be read as an image.");
    };
    img.src = url;
  });

// Laravel 422 response -> { field: "first message" }
export const serverFieldErrors = (err) => {
  const errors = err.response?.data?.errors;
  if (!errors) return null;
  return Object.fromEntries(Object.entries(errors).map(([field, msgs]) => [field, msgs[0]]));
};
