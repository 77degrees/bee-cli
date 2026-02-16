import type { CalendarEvent } from "@/integrations/types";

export function parseICalEvents(icalData: string, calendarName: string): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const eventBlocks = icalData.split("BEGIN:VEVENT");

  for (let i = 1; i < eventBlocks.length; i++) {
    const block = eventBlocks[i];
    if (!block) {
      continue;
    }
    const endIndex = block.indexOf("END:VEVENT");
    const eventStr = endIndex >= 0 ? block.slice(0, endIndex) : block;

    const uid = extractField(eventStr, "UID") ?? `unknown-${i}`;
    const summary = extractField(eventStr, "SUMMARY") ?? "(no title)";
    const description = extractField(eventStr, "DESCRIPTION");
    const start = extractField(eventStr, "DTSTART") ?? "";
    const end = extractField(eventStr, "DTEND");
    const location = extractField(eventStr, "LOCATION");

    events.push({
      uid,
      summary: unfoldIcalValue(summary),
      description: description ? unfoldIcalValue(description) : null,
      start: formatIcalDate(start),
      end: end ? formatIcalDate(end) : null,
      location: location ? unfoldIcalValue(location) : null,
      calendar: calendarName,
    });
  }

  return events;
}

function extractField(block: string, fieldName: string): string | null {
  const patterns = [
    new RegExp(`^${fieldName}[;:][^\r\n]*`, "m"),
    new RegExp(`^${fieldName}[^\r\n]*`, "m"),
  ];

  for (const pattern of patterns) {
    const match = block.match(pattern);
    if (match?.[0]) {
      const line = match[0];
      const colonIndex = line.indexOf(":");
      if (colonIndex >= 0) {
        return line.slice(colonIndex + 1).trim();
      }
    }
  }

  return null;
}

function unfoldIcalValue(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\\\/g, "\\")
    .trim();
}

function formatIcalDate(value: string): string {
  const cleaned = value.replace(/[^0-9TZ]/g, "");
  if (cleaned.length === 8) {
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
  }
  if (cleaned.length >= 15) {
    const date = `${cleaned.slice(0, 4)}-${cleaned.slice(4, 6)}-${cleaned.slice(6, 8)}`;
    const time = `${cleaned.slice(9, 11)}:${cleaned.slice(11, 13)}:${cleaned.slice(13, 15)}`;
    const tz = cleaned.endsWith("Z") ? "Z" : "";
    return `${date}T${time}${tz}`;
  }
  return value;
}
