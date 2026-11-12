// Client-side checks that mirror the API rules (same as the web app).
// Each validator returns { field: "message" }; empty means valid.

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

// Laravel 422 response -> { field: "first message" }
export const serverFieldErrors = (err) => {
  const errors = err.response?.data?.errors;
  if (!errors) return null;
  return Object.fromEntries(Object.entries(errors).map(([field, msgs]) => [field, msgs[0]]));
};
