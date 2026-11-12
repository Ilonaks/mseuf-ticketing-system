import { QRCodeSVG } from "qrcode.react";
import { ChartIcon, ScanIcon, TicketIcon } from "./Icons";

// Split screen for login/register: brand panel on the left, form on the right
export default function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-shell">
        <aside className="auth-hero">
          <div className="auth-brand">
            <div className="logo">M</div>
            <div>
              <strong>MSEUF Events</strong>
              <small>Manuel S. Enverga University Foundation</small>
            </div>
          </div>

          <div className="auth-copy">
            <h2>Campus events, one ticket away.</h2>
            <p>Reserve a seat, show your QR code at the door, and you're in.</p>
          </div>

          {/* Decorative sample ticket */}
          <div className="sample-ticket" aria-hidden="true">
            <div className="sample-ticket-main">
              <small>22 NOV · 6:00 PM</small>
              <strong>Foundation Week Concert</strong>
              <span>MSEUF Gymnasium</span>
              <code>MSEUF-A8K2PX9Q</code>
            </div>
            <div className="sample-ticket-qr">
              <QRCodeSVG value="MSEUF-A8K2PX9Q" size={76} bgColor="transparent" fgColor="#fff" />
            </div>
          </div>

          <ul className="auth-features">
            <li><TicketIcon size={18} /> Reserve tickets</li>
            <li><ScanIcon size={18} /> QR check-in</li>
            <li><ChartIcon size={18} /> Live reports</li>
          </ul>
        </aside>

        <div className="auth-form">{children}</div>
      </div>
    </div>
  );
}
