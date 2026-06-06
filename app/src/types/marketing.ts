export type CampaignStatus = 'draft' | 'sending' | 'sent' | 'paused' | 'canceled';
export type TemplateStatus = 'draft' | 'published' | 'canceled';
export type DomainStatus = 'pending' | 'verified' | 'failed';
export type RecipientStatus =
  | 'pending' | 'sent' | 'delivered' | 'opened'
  | 'clicked' | 'bounced' | 'skipped' | 'unsubscribed';

export type CampaignTemplate = {
  id: string;
  name: string;
  subject: string;
};

export type Campaign = {
  id: string;
  name: string;
  type: 'regular' | 'ab_test';
  status: CampaignStatus;
  subject: string;
  fromName: string;
  fromEmail: string;
  recipientsCount: number;
  sentCount: number;
  deliveredCount: number;
  openedCount: number;
  clickedCount: number;
  bouncedCount: number;
  unsubscribedCount: number;
  isCanceled: boolean;
  template?: CampaignTemplate | null;
  createdAt: string;
  updatedAt: string;
};

export type CampaignRecipient = {
  id: string;
  status: RecipientStatus;
  abVariant?: 'A' | 'B' | null;
  skipReason?: string | null;
  unsubReason?: string | null;
  sentAt?: string | null;
  contact?: {
    firstName: string;
    lastName: string;
    email: string;
    company?: string | null;
    lifecycleStage?: string | null;
  } | null;
};

export type Template = {
  id: string;
  clientId?: string | null;
  name: string;
  subject: string;
  fromEmail: string;
  status: TemplateStatus;
  isCanceled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type DnsRecord = {
  record: string;
  type: string;
  name: string;
  value: string;
  status?: string;
  ttl?: string;
};

export type Domain = {
  id: string;
  clientId?: string | null;
  domainName: string;
  status: DomainStatus;
  defaultFromEmail: string;
  spfRecord: string;
  dkimRecord: string;
  dmarcRecord: string;
  isCanceled: boolean;
  createdAt: string;
};
