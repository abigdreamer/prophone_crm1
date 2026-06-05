export default class EmailProvider {
  async sendSingle(_payload) {
    throw new Error('Not implemented');
  }

  async sendBatch(_payloads) {
    throw new Error('Not implemented');
  }

  async testConnection() {
    throw new Error('Not implemented');
  }
}
