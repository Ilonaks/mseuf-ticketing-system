// Label + input + inline error message
export default function Field({ label, error, children, htmlFor }) {
  return (
    <div className={`field ${error ? "field-invalid" : ""}`}>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error && <small className="field-error">{error}</small>}
    </div>
  );
}
