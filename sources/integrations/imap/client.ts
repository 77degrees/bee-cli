import { ImapFlow } from "imapflow";
import type { MailProvider, MailMessage } from "@/integrations/types";

export type ImapConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
};

export function createImapProvider(config: ImapConfig): MailProvider {
  let client: ImapFlow | null = null;

  async function getClient(): Promise<ImapFlow> {
    if (client) {
      return client;
    }
    client = new ImapFlow({
      host: config.host,
      port: config.port,
      secure: true,
      auth: {
        user: config.username,
        pass: config.password,
      },
      logger: false,
    });
    await client.connect();
    return client;
  }

  return {
    name: "imap",

    recent: async (limit: number): Promise<MailMessage[]> => {
      const imap = await getClient();
      const lock = await imap.getMailboxLock("INBOX");

      try {
        const messages: MailMessage[] = [];
        const mailbox = imap.mailbox;
        const total = mailbox && typeof mailbox === "object" ? (mailbox.exists ?? 0) : 0;
        if (total === 0) {
          return [];
        }

        const startSeq = Math.max(1, total - limit + 1);
        const range = `${startSeq}:*`;

        for await (const msg of imap.fetch(range, {
          envelope: true,
          bodyStructure: true,
        })) {
          messages.push({
            uid: msg.uid,
            subject: msg.envelope?.subject ?? "(no subject)",
            from: formatAddress(msg.envelope?.from),
            date: msg.envelope?.date?.toISOString() ?? "",
            snippet: "",
          });
        }

        return messages.reverse().slice(0, limit);
      } finally {
        lock.release();
      }
    },

    search: async (query: string, limit: number): Promise<MailMessage[]> => {
      const imap = await getClient();
      const lock = await imap.getMailboxLock("INBOX");

      try {
        const searchResult = await imap.search({
          or: [{ subject: query }, { body: query }],
        });

        const uids = Array.isArray(searchResult) ? searchResult : [];
        const targetUids = uids.slice(-limit);
        if (targetUids.length === 0) {
          return [];
        }

        const messages: MailMessage[] = [];
        const uidRange = targetUids.join(",");

        for await (const msg of imap.fetch(uidRange, {
          envelope: true,
          uid: true,
        })) {
          messages.push({
            uid: msg.uid,
            subject: msg.envelope?.subject ?? "(no subject)",
            from: formatAddress(msg.envelope?.from),
            date: msg.envelope?.date?.toISOString() ?? "",
            snippet: "",
          });
        }

        return messages.reverse();
      } finally {
        lock.release();
      }
    },

    disconnect: async (): Promise<void> => {
      if (client) {
        await client.logout();
        client = null;
      }
    },
  };
}

function formatAddress(
  addresses: Array<{ name?: string; address?: string }> | undefined
): string {
  if (!addresses || addresses.length === 0) {
    return "(unknown)";
  }
  const first = addresses[0];
  if (!first) {
    return "(unknown)";
  }
  return first.name ?? first.address ?? "(unknown)";
}
