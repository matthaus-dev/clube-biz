export class InvalidIdentityError extends Error {}

export function normalizePhone(input: string, defaultCountryCode = "55"): string {
  const digits = input.replace(/\D/g, "");
  let national = digits;

  if (national.startsWith("00")) national = national.slice(2);
  if (!national.startsWith(defaultCountryCode) && national.length >= 10 && national.length <= 11) {
    national = `${defaultCountryCode}${national}`;
  }

  if (national.length < 12 || national.length > 15 || national.startsWith("0")) {
    throw new InvalidIdentityError("Telefone inválido");
  }

  return `+${national}`;
}

export function normalizeCpf(input: string): string {
  const cpf = input.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    throw new InvalidIdentityError("CPF inválido");
  }

  const digit = (length: number) => {
    const sum = cpf
      .slice(0, length)
      .split("")
      .reduce((total, value, index) => total + Number(value) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  if (digit(9) !== Number(cpf[9]) || digit(10) !== Number(cpf[10])) {
    throw new InvalidIdentityError("CPF inválido");
  }
  return cpf;
}

export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return `+${digits.slice(0, 2)} •••••• ${digits.slice(-4)}`;
}

export function maskCpf(cpf: string): string {
  return `***.***.***-${cpf.slice(-2)}`;
}
