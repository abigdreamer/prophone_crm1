export interface Activity {
  id: string;
  type: string;
  note: string;
  createdAt: string;
  by?: string | null;
}

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
  title: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lifecycleStage: string;
  leadScore: number;
  status: string;
  source: string;
  campaign: string;
  trucks: number;
  accountSize: string;
  contractValue: number;
  yearsInBusiness: number;
  serviceAreaMiles: number;
  dispatcherSoftware: string;
  emailsSent: number;
  emailsOpened: number;
  emailsClicked: number;
  callsMade: number;
  callsAnswered: number;
  lastActivityAt: string;
  createdAt: string;
  activities?: Activity[];
  // extended fields
  estRevenue?: string;
  servicesOffered?: string;
  motorClubAffiliations?: string;
  painPoints?: string;
  facebook?: string;
  instagram?: string;
  linkedin?: string;
  tiktok?: string;
  notes?: string;
  tags?: string;
}
