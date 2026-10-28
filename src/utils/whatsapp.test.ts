import { describe, it, expect } from "vitest";
import { whatsappUrl } from "./whatsapp";

describe("whatsappUrl", () => {
  it("usa api.whatsapp.com y conserva los emojis codificados", () => {
    const url = whatsappUrl("+51 974 622 002", "Hola 👋 ✅");
    expect(url.startsWith("https://api.whatsapp.com/send?phone=51974622002&text=")).toBe(true);
    expect(decodeURIComponent(url.split("text=")[1])).toBe("Hola 👋 ✅");
    expect(url).not.toContain("%EF%BF%BD");
  });
});
