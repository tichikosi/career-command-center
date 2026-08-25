export interface NetworkContact {
  id: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  position?: string;
  linkedInUrl?: string;
  connectedOn?: string;
  source: 'linkedin_csv' | 'generic_csv' | 'excel' | 'manual' | 'demo';
  importedAt: string;
  notes?: string;
}

export interface NetworkColumnMapping {
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  company: string;
  position: string;
  linkedInUrl: string;
  connectedOn: string;
}

export interface ImportPreviewResult {
  totalRows: number;
  mappedContacts: NetworkContact[];
  duplicatesMerged: number;
  invalidRowsSkipped: number;
  detectedCompanies: string[];
}
