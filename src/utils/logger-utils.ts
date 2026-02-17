export function createRequestId(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function maskToken(token: string): string {
  return token.length === 0 ? "***" : "***";
}
