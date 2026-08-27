import { describe, expect, it } from "vitest";
import { maskCpf, maskPhone, normalizeCpf, normalizePhone } from "./identity";

describe("customer identity", () => {
  it("normalizes a Brazilian mobile phone", () => {
    expect(normalizePhone("(11) 98765-4321")).toBe("+5511987654321");
  });

  it("rejects an invalid phone", () => {
    expect(() => normalizePhone("1234")).toThrow("Telefone inválido");
  });

  it("normalizes and validates CPF", () => {
    expect(normalizeCpf("529.982.247-25")).toBe("52998224725");
  });

  it("rejects repeated CPF digits", () => {
    expect(() => normalizeCpf("111.111.111-11")).toThrow("CPF inválido");
  });

  it("masks identifiers", () => {
    expect(maskPhone("+5511987654321")).toBe("+55 •••••• 4321");
    expect(maskCpf("52998224725")).toBe("***.***.***-25");
  });
});
