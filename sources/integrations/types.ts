export type IntegrationType = "calendar" | "mail";

export type ProviderName = "icloud" | "google" | "outlook" | "generic";

export type IntegrationConfig = {
  id: number;
  name: string;
  type: IntegrationType;
  provider: ProviderName;
  host: string | null;
  port: number | null;
  username: string | null;
  enabled: boolean;
};

export type CalendarEvent = {
  uid: string;
  summary: string;
  description: string | null;
  start: string;
  end: string | null;
  location: string | null;
  calendar: string;
};

export type CalendarProvider = {
  name: string;
  listCalendars: () => Promise<string[]>;
  listEvents: (from: Date, to: Date) => Promise<CalendarEvent[]>;
};

export type MailMessage = {
  uid: number;
  subject: string;
  from: string;
  date: string;
  snippet: string;
};

export type MailProvider = {
  name: string;
  recent: (limit: number) => Promise<MailMessage[]>;
  search: (query: string, limit: number) => Promise<MailMessage[]>;
  disconnect: () => Promise<void>;
};
