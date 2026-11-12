import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DialogProvider } from "../context/DialogContext";
import Login from "../pages/Login";

const login = vi.fn();
vi.mock("../context/AuthContext", () => ({ useAuth: () => ({ login }) }));

const renderLogin = () =>
  render(
    <MemoryRouter>
      <DialogProvider>
        <Login />
      </DialogProvider>
    </MemoryRouter>
  );

describe("Login page", () => {
  beforeEach(() => login.mockReset());

  it("shows field errors and does not call the API when the form is empty", async () => {
    renderLogin();
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByText("Enter your email.")).toBeInTheDocument();
    expect(screen.getByText("Enter your password.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("rejects a malformed email", async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText("Email"), "juan@");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(screen.getByText("Enter a valid email address.")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it("fills a demo account and logs in", async () => {
    login.mockResolvedValueOnce({ user: { name: "Juan Dela Cruz" }, signed_out_other_device: true });
    renderLogin();

    await userEvent.click(screen.getByRole("button", { name: "Student" }));
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(login).toHaveBeenCalledWith("juan@mseuf.edu.ph", "password123");
    expect(await screen.findByText("Welcome back, Juan Dela Cruz!")).toBeInTheDocument();
    expect(screen.getByText("Your account was logged out on the other device you were using.")).toBeInTheDocument();
  });

  it("shows the server's message for wrong credentials", async () => {
    login.mockImplementationOnce(() => Promise.reject({
      response: { status: 422, data: { errors: { email: ["The provided credentials are incorrect."] } } },
    }));
    renderLogin();

    await userEvent.type(screen.getByLabelText("Email"), "juan@mseuf.edu.ph");
    await userEvent.type(screen.getByLabelText("Password"), "wrong");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText("The provided credentials are incorrect.")).toBeInTheDocument();
  });

  it("explains rate limiting", async () => {
    login.mockImplementationOnce(() => Promise.reject({ response: { status: 429, data: {} } }));
    renderLogin();

    await userEvent.type(screen.getByLabelText("Email"), "juan@mseuf.edu.ph");
    await userEvent.type(screen.getByLabelText("Password"), "x");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));

    expect(await screen.findByText(/Too many login attempts/)).toBeInTheDocument();
  });

  it("toggles password visibility", async () => {
    renderLogin();
    const password = screen.getByLabelText("Password");
    expect(password).toHaveAttribute("type", "password");

    await userEvent.click(screen.getByRole("button", { name: "Show" }));
    expect(password).toHaveAttribute("type", "text");
  });
});
