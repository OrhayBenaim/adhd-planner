import { ConvexError } from "convex/values";
import { canSendContact, contactSendError, isValidEmail } from "../contactForm";

describe("canSendContact", () => {
  const filled = { topic: "bug" as const, message: "It froze", email: "", needsEmail: false };

  it("allows a topic and message when the account has a real email", () =>
    expect(canSendContact(filled)).toBe(true));
  it("needs a topic", () => expect(canSendContact({ ...filled, topic: null })).toBe(false));
  it("needs a message with text", () => expect(canSendContact({ ...filled, message: "   " })).toBe(false));
  it("ignores the email when the account has a real email", () =>
    expect(canSendContact({ ...filled, email: "nope" })).toBe(true));
  it("needs a valid email when the Email field shows", () => {
    expect(canSendContact({ ...filled, needsEmail: true, email: "" })).toBe(false);
    expect(canSendContact({ ...filled, needsEmail: true, email: "me@example" })).toBe(false);
    expect(canSendContact({ ...filled, needsEmail: true, email: " me@example.com " })).toBe(true);
  });
});

describe("isValidEmail", () => {
  it("accepts an address with a domain", () => expect(isValidEmail("you@example.com")).toBe(true));
  it("rejects text without @ or a dotted domain", () => {
    expect(isValidEmail("you")).toBe(false);
    expect(isValidEmail("you@example")).toBe(false);
    expect(isValidEmail("y ou@example.com")).toBe(false);
  });
});

describe("contactSendError", () => {
  it("shows the rate-limit message when the server rate-limits", () =>
    expect(contactSendError(new ConvexError("You've sent a few messages in a row. Try again in a few minutes.")))
      .toBe("You've sent a few messages in a row. Try again in a few minutes."));
  it("shows the connection message for any other failure", () => {
    const network = "Couldn't send your message. Check your connection and try again.";
    expect(contactSendError(new Error("Network request failed"))).toBe(network);
    expect(contactSendError(new ConvexError("Message is required"))).toBe(network);
  });
});
