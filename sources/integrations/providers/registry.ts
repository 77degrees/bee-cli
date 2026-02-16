import type { IntegrationConfig, CalendarProvider, MailProvider } from "@/integrations/types";
import { loadCredential } from "@/integrations/credentialStore";
import { getProviderDefaults } from "@/integrations/providers/defaults";
import { createCalDavProvider } from "@/integrations/caldav/client";
import { createImapProvider } from "@/integrations/imap/client";

export async function createCalendarProviderFromConfig(
  config: IntegrationConfig
): Promise<CalendarProvider> {
  const credential = loadCredential(config.name);
  if (!credential) {
    throw new Error(`No credentials stored for "${config.name}". Re-add the integration.`);
  }

  const defaults = getProviderDefaults(config.provider);
  const host = config.host ?? defaults.calendarHost;
  if (!host) {
    throw new Error(`No calendar host configured for "${config.name}".`);
  }

  const serverUrl = `https://${host}${defaults.calendarPath ?? "/"}`;

  return createCalDavProvider({
    serverUrl,
    username: config.username ?? "",
    password: credential.password,
  });
}

export function createMailProviderFromConfig(
  config: IntegrationConfig
): MailProvider {
  const credential = loadCredential(config.name);
  if (!credential) {
    throw new Error(`No credentials stored for "${config.name}". Re-add the integration.`);
  }

  const defaults = getProviderDefaults(config.provider);
  const host = config.host ?? defaults.imapHost;
  if (!host) {
    throw new Error(`No IMAP host configured for "${config.name}".`);
  }

  const port = config.port ?? defaults.imapPort ?? 993;

  return createImapProvider({
    host,
    port,
    username: config.username ?? "",
    password: credential.password,
  });
}
