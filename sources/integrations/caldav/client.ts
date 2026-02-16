import { createDAVClient, type DAVCalendar } from "tsdav";
import type { CalendarProvider, CalendarEvent } from "@/integrations/types";
import { parseICalEvents } from "@/integrations/caldav/ical";

export type CalDavConfig = {
  serverUrl: string;
  username: string;
  password: string;
};

export async function createCalDavProvider(config: CalDavConfig): Promise<CalendarProvider> {
  const client = await createDAVClient({
    serverUrl: config.serverUrl,
    credentials: {
      username: config.username,
      password: config.password,
    },
    authMethod: "Basic",
    defaultAccountType: "caldav",
  });

  let calendars: DAVCalendar[] = [];

  return {
    name: "caldav",

    listCalendars: async (): Promise<string[]> => {
      calendars = await client.fetchCalendars();
      return calendars.map((cal) => resolveCalendarName(cal));
    },

    listEvents: async (from: Date, to: Date): Promise<CalendarEvent[]> => {
      if (calendars.length === 0) {
        calendars = await client.fetchCalendars();
      }

      const allEvents: CalendarEvent[] = [];

      for (const calendar of calendars) {
        try {
          const objects = await client.fetchCalendarObjects({
            calendar,
            timeRange: {
              start: from.toISOString(),
              end: to.toISOString(),
            },
          });

          for (const obj of objects) {
            if (obj.data) {
              const events = parseICalEvents(
                obj.data,
                resolveCalendarName(calendar)
              );
              allEvents.push(...events);
            }
          }
        } catch {
          // Skip calendars that fail
        }
      }

      return allEvents.sort((a, b) => a.start.localeCompare(b.start));
    },
  };
}

function resolveCalendarName(cal: DAVCalendar): string {
  if (typeof cal.displayName === "string") {
    return cal.displayName;
  }
  if (typeof cal.url === "string") {
    return cal.url;
  }
  return "(unknown calendar)";
}
