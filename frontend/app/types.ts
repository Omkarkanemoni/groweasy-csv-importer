export type CrmRecord = {
  created_at: string;
  name: string;
  email: string;
  country_code: string;
  mobile_without_country_code: string;
  company: string;
  city: string;
  state: string;
  country: string;
  lead_owner: string;
  crm_status: string;
  crm_note: string;
  data_source: string;
  possession_time: string;
  description: string;
};

export type SkippedRecord = {
  index: number;
  reason: string;
};

export type ImportResponse = {
  success: boolean;
  totalInput: number;
  totalImported: number;
  totalSkipped: number;
  records: CrmRecord[];
  skipped: SkippedRecord[];
  failedBatches: number[];
  error?: string;
};

export type RawRow = Record<string, string>;

export const CRM_FIELD_LABELS: Record<keyof CrmRecord, string> = {
  created_at: "Created At",
  name: "Name",
  email: "Email",
  country_code: "Country Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead Owner",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Source",
  possession_time: "Possession",
  description: "Description",
};
