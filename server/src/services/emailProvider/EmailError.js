export class EmailError extends Error {
  constructor(message, { code = 'EMAIL_SEND_FAILED', provider = 'unknown', originalError = null } = {}) {
    super(message);
    this.name = 'EmailError';
    this.code = code;
    this.provider = provider;
    this.originalError = originalError;
  }
}
