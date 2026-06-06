export interface Client {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  _count?: { contacts: number };
}
