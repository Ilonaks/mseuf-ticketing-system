import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DialogProvider } from "../context/DialogContext";
import Events from "../pages/Events";
import api from "../api/axios";

vi.mock("../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { id: 3, name: "Juan Dela Cruz", role: "student" } }),
}));

const future = (days, hour = 18) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const concert = {
  id: 1,
  user_id: 2,
  title: "Foundation Week Concert",
  venue: "MSEUF Gymnasium",
  start_at: future(10),
  end_at: future(10, 22),
  capacity: 500,
  price: "150.00",
  status: "published",
  tickets_count: 10,
  waitlist_count: 0,
  on_waitlist: false,
  category_id: 3,
  category: { id: 3, name: "Cultural", color: "#9a3412" },
  organizer: { id: 2, name: "Student Council" },
};
const soldOutTalk = {
  ...concert,
  id: 2,
  title: "IT Days: Tech Talk",
  venue: "AVR",
  price: "0.00",
  capacity: 2,
  tickets_count: 2,
  waitlist_count: 1,
  category_id: 5,
  category: { id: 5, name: "Tech", color: "#5b21b6" },
};

const mockApi = () => {
  api.get.mockImplementation((url) => {
    if (url === "/events") return Promise.resolve({ data: [concert, soldOutTalk] });
    if (url === "/tickets") return Promise.resolve({ data: [] });
    if (url === "/categories") return Promise.resolve({ data: [concert.category, soldOutTalk.category] });
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
};

const renderEvents = () =>
  render(
    <MemoryRouter>
      <DialogProvider>
        <Events />
      </DialogProvider>
    </MemoryRouter>
  );

describe("Events page (student)", () => {
  beforeEach(mockApi);

  it("asks for confirmation before reserving, and does nothing on cancel", async () => {
    renderEvents();
    await userEvent.click(await screen.findByRole("button", { name: /Get Ticket/ }));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("Reserve a ticket?")).toBeInTheDocument();
    expect(within(dialog).getByText(/₱150\.00/)).toBeInTheDocument();

    await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("reserves after confirming and shows the ticket code", async () => {
    api.post.mockResolvedValue({ data: { message: "Ticket reserved successfully.", ticket: { ticket_code: "MSEUF-TEST1234" } } });
    renderEvents();

    await userEvent.click(await screen.findByRole("button", { name: /Get Ticket/ }));
    await userEvent.click(screen.getByRole("button", { name: "Get ticket" }));

    expect(api.post).toHaveBeenCalledWith("/events/1/tickets");
    expect(await screen.findByText(/MSEUF-TEST1234/)).toBeInTheDocument();
  });

  it("offers the waitlist for a sold-out event", async () => {
    api.post.mockResolvedValue({ data: { message: "Joined", position: 2 } });
    renderEvents();

    await userEvent.click(await screen.findByRole("button", { name: /IT Days: Tech Talk/ }));
    await userEvent.click(screen.getByRole("button", { name: /Join waitlist/ }));
    await userEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Join waitlist" }));

    expect(api.post).toHaveBeenCalledWith("/events/2/waitlist");
    expect(await screen.findByText("You're #2 on the waitlist.")).toBeInTheDocument();
  });

  it("filters by search text and category", async () => {
    renderEvents();
    await screen.findByRole("button", { name: /Foundation Week Concert/ });

    await userEvent.type(screen.getByLabelText("Search events"), "tech talk");
    expect(screen.queryByRole("button", { name: /Foundation Week Concert/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /IT Days: Tech Talk/ })).toBeInTheDocument();

    await userEvent.click(screen.getAllByRole("button", { name: "Clear filters" })[0]);
    await userEvent.click(screen.getByRole("button", { name: "Cultural" }));
    expect(screen.getByRole("button", { name: /Foundation Week Concert/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /IT Days: Tech Talk/ })).not.toBeInTheDocument();
  });
});
