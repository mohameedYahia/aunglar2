// FIX: Removed self-import of `Customer` which caused a conflict with the local declaration of the same name.

export interface Customer {
  id: number;
  name: string;
  landCount: number;
  investorType: 'شركة' | 'فرد';
  mechanism: 'مزاد علني' | 'أمر مباشر' | 'مبادرة';
  currency: 'EGP' | 'USD';
  center: 'الخارجة' | 'الداخلة' | 'الفرافرة' | 'باريس' | 'بلاط';
}

export interface Land {
  landId: string;
  mechanism: 'مزاد علني' | 'أمر مباشر' | 'مبادرة';
  basicInfo: {
    receiveDate: string;
    auctionSessionDate?: string;
  };
  auctionInfo: {
    landArea: number;
    landLocation: string;
  };
  currency: 'EGP' | 'USD';
  baseRent: number;
  financials: {
    feddanValue: number;
    feddanRentalValue: number;
    insurance: number;
  };
}

export interface CustomerDetails {
  investorType: 'شركة' | 'فرد';
  notes: string;
  lands: Land[];
  // Company specific
  fileNumber?: string;
  companyNationality?: string;
  partnersNationality?: string;
  address?: string;
  email?: string;
  companyPhone?: string;
  commercialRegNum?: string;
  commercialRegExpiry?: string;
  taxCardNum?: string;
  taxCardExpiry?: string;
  issuingAuthority?: string;
  companyActivity?: string;
  chairman?: { name: string; phone: string };
  partners?: { name: string; phone: string }[];
  // Individual specific
  nationalId?: string;
  phone?: string;
  mailingAddress?: string;
}

export interface Invoice {
  id: string;
  customerId: number;
  landId: string;
  description: string;
  dueDate: string;
  originalAmount: number;
  currency: 'EGP' | 'USD';
  reminderLog: Reminder[];
  status: 'pending' | 'paid' | 'reviewed' | 'awaiting_confirmation';
}

export interface Reminder {
  user: string;
  date: string;
}

export interface Payment {
  paymentId: string;
  invoiceId: string | null;
  customerId: number;
  landId: string;
  paymentDate: string;
  amount: number;
  currency: 'EGP' | 'USD';
  method: 'تحويل بنكي' | 'شيك' | 'نقدي';
  description: string;
  details: any;
  documentUrl: string;
  notes: string;
  status: 'pending_review' | 'confirmed' | 'rejected';
  auctionId?: string;
  tempInsuranceStatus?: 'booked' | 'awarded' | 'returned';
}

export interface HistoryLogEntry {
    id: number;
    invoiceId: string;
    type: 'reminder' | 'warning';
    user: string;
    timestamp: string;
    deliveryMethods?: string[];
    deadline?: string;
    content?: string;
}

export interface WarningTemplate {
    content: string;
}
