import type { ProviderName } from "@/integrations/types";

export type ProviderDefaults = {
  calendarHost?: string | undefined;
  calendarPath?: string | undefined;
  imapHost?: string | undefined;
  imapPort?: number | undefined;
};

const PROVIDER_DEFAULTS: Record<ProviderName, ProviderDefaults> = {
  icloud: {
    calendarHost: "caldav.icloud.com",
    calendarPath: "/",
    imapHost: "imap.mail.me.com",
    imapPort: 993,
  },
  google: {
    calendarHost: "apidata.googleusercontent.com",
    calendarPath: "/caldav/v2/",
    imapHost: "imap.gmail.com",
    imapPort: 993,
  },
  outlook: {
    calendarHost: "outlook.office365.com",
    calendarPath: "/caldav/",
    imapHost: "outlook.office365.com",
    imapPort: 993,
  },
  generic: {},
};

export function getProviderDefaults(provider: ProviderName): ProviderDefaults {
  return PROVIDER_DEFAULTS[provider];
}
