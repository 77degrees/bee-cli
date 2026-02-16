import type { BeeCliRunner } from "./runner.js";

type ListOptions = {
  limit?: number;
  cursor?: string;
};

type FactsListOptions = ListOptions & {
  unconfirmed?: boolean;
};

type ChangedOptions = {
  cursor?: string;
};

type TodoCreateOptions = {
  text: string;
  alarmAt?: string;
};

type TodoUpdateOptions = {
  text?: string;
  completed?: boolean;
  alarmAt?: string;
  clearAlarm?: boolean;
};

type FactUpdateOptions = {
  text: string;
  confirmed?: boolean;
};

type SearchOptions = {
  query: string;
  limit?: number;
  since?: number;
  until?: number;
  neural?: boolean;
};

type ConfigSetOptions = {
  key: string;
  value: string;
};

type SpeakerCreateOptions = {
  name: string;
  notes?: string;
};

type SpeakerAssignOptions = {
  conversationId: number;
  speakerLabel: string;
  profileName: string;
};

type CiteSearchOptions = {
  query: string;
  limit?: number;
};

type CalendarEventsOptions = {
  from?: string;
  to?: string;
};

type MailSearchOptions = {
  query: string;
  provider?: string;
  limit?: number;
};

export type DataApi = {
  me: <T = unknown>() => Promise<T>;
  today: <T = unknown>() => Promise<T>;
  now: <T = unknown>() => Promise<T>;
  changed: <T = unknown>(options?: ChangedOptions) => Promise<T>;
  version: <T = unknown>() => Promise<T>;
  facts: {
    list: <T = unknown>(options?: FactsListOptions) => Promise<T>;
    get: <T = unknown>(id: string | number) => Promise<T>;
    create: <T = unknown>(text: string) => Promise<T>;
    update: <T = unknown>(id: string | number, options: FactUpdateOptions) => Promise<T>;
    delete: <T = unknown>(id: string | number) => Promise<T>;
  };
  todos: {
    list: <T = unknown>(options?: ListOptions) => Promise<T>;
    get: <T = unknown>(id: string | number) => Promise<T>;
    create: <T = unknown>(options: TodoCreateOptions) => Promise<T>;
    update: <T = unknown>(id: string | number, options: TodoUpdateOptions) => Promise<T>;
    delete: <T = unknown>(id: string | number) => Promise<T>;
  };
  conversations: {
    list: <T = unknown>(options?: ListOptions) => Promise<T>;
    get: <T = unknown>(id: string | number) => Promise<T>;
  };
  daily: {
    list: <T = unknown>(options?: ListOptions) => Promise<T>;
    get: <T = unknown>(id: string | number) => Promise<T>;
  };
  journals: {
    list: <T = unknown>(options?: ListOptions) => Promise<T>;
    get: <T = unknown>(id: string | number) => Promise<T>;
  };
  search: <T = unknown>(options: SearchOptions) => Promise<T>;
  config: {
    set: <T = unknown>(options: ConfigSetOptions) => Promise<T>;
    get: <T = unknown>(key: string) => Promise<T>;
    list: <T = unknown>() => Promise<T>;
    delete: <T = unknown>(key: string) => Promise<T>;
  };
  speakers: {
    list: <T = unknown>() => Promise<T>;
    create: <T = unknown>(options: SpeakerCreateOptions) => Promise<T>;
    delete: <T = unknown>(id: string | number) => Promise<T>;
    assign: <T = unknown>(options: SpeakerAssignOptions) => Promise<T>;
    identify: <T = unknown>(conversationId: string | number) => Promise<T>;
    learn: <T = unknown>(options?: { profile?: string; limit?: number }) => Promise<T>;
  };
  cite: {
    show: <T = unknown>(factId: string | number) => Promise<T>;
    search: <T = unknown>(options: CiteSearchOptions) => Promise<T>;
    rebuild: <T = unknown>() => Promise<T>;
  };
  infer: {
    run: <T = unknown>(conversationId: string | number) => Promise<T>;
    list: <T = unknown>(options?: { conversationId?: string | number }) => Promise<T>;
    clear: <T = unknown>(options?: { conversationId?: string | number }) => Promise<T>;
  };
  integrations: {
    list: <T = unknown>() => Promise<T>;
    remove: <T = unknown>(name: string) => Promise<T>;
    test: <T = unknown>(name: string) => Promise<T>;
  };
  calendar: {
    list: <T = unknown>() => Promise<T>;
    events: <T = unknown>(options?: CalendarEventsOptions) => Promise<T>;
  };
  mail: {
    recent: <T = unknown>(options?: { limit?: number }) => Promise<T>;
    search: <T = unknown>(options: MailSearchOptions) => Promise<T>;
  };
};

export function createDataApi(runner: BeeCliRunner): DataApi {
  return {
    me: () => runner.runJson(["me"]),
    today: () => runner.runJson(["today"]),
    now: () => runner.runJson(["now"]),
    changed: (options) => {
      const args = ["changed"];
      if (options?.cursor) {
        args.push("--cursor", options.cursor);
      }
      return runner.runJson(args);
    },
    version: () => runner.runJson(["version"]),
    facts: {
      list: (options) => {
        const args = ["facts", "list"];
        appendListOptions(args, options);
        if (options?.unconfirmed) {
          args.push("--unconfirmed");
        }
        return runner.runJson(args);
      },
      get: (id) => runner.runJson(["facts", "get", String(id)]),
      create: (text) => runner.runJson(["facts", "create", "--text", text]),
      update: (id, options) => {
        const args = ["facts", "update", String(id), "--text", options.text];
        if (options.confirmed !== undefined) {
          args.push("--confirmed", String(options.confirmed));
        }
        return runner.runJson(args);
      },
      delete: (id) => runner.runJson(["facts", "delete", String(id)]),
    },
    todos: {
      list: (options) => {
        const args = ["todos", "list"];
        appendListOptions(args, options);
        return runner.runJson(args);
      },
      get: (id) => runner.runJson(["todos", "get", String(id)]),
      create: (options) => {
        const args = ["todos", "create", "--text", options.text];
        if (options.alarmAt) {
          args.push("--alarm-at", options.alarmAt);
        }
        return runner.runJson(args);
      },
      update: (id, options) => {
        const args = ["todos", "update", String(id)];
        if (options.text !== undefined) {
          args.push("--text", options.text);
        }
        if (options.completed !== undefined) {
          args.push("--completed", String(options.completed));
        }
        if (options.alarmAt !== undefined) {
          args.push("--alarm-at", options.alarmAt);
        } else if (options.clearAlarm) {
          args.push("--clear-alarm");
        }
        return runner.runJson(args);
      },
      delete: (id) => runner.runJson(["todos", "delete", String(id)]),
    },
    conversations: {
      list: (options) => {
        const args = ["conversations", "list"];
        appendListOptions(args, options);
        return runner.runJson(args);
      },
      get: (id) => runner.runJson(["conversations", "get", String(id)]),
    },
    daily: {
      list: (options) => {
        const args = ["daily", "list"];
        appendListOptions(args, options);
        return runner.runJson(args);
      },
      get: (id) => runner.runJson(["daily", "get", String(id)]),
    },
    journals: {
      list: (options) => {
        const args = ["journals", "list"];
        appendListOptions(args, options);
        return runner.runJson(args);
      },
      get: (id) => runner.runJson(["journals", "get", String(id)]),
    },
    search: (options) => {
      const args = ["search", "--query", options.query];
      if (options.limit !== undefined) {
        args.push("--limit", String(options.limit));
      }
      if (options.since !== undefined) {
        args.push("--since", String(options.since));
      }
      if (options.until !== undefined) {
        args.push("--until", String(options.until));
      }
      if (options.neural) {
        args.push("--neural");
      }
      return runner.runJson(args);
    },
    config: {
      set: (options) =>
        runner.runJson(["config", "set", options.key, options.value]),
      get: (key) => runner.runJson(["config", "get", key]),
      list: () => runner.runJson(["config", "list", "--json"]),
      delete: (key) => runner.runJson(["config", "delete", key]),
    },
    speakers: {
      list: () => runner.runJson(["speakers", "list", "--json"]),
      create: (options) => {
        const args = ["speakers", "create", "--name", options.name];
        if (options.notes) {
          args.push("--notes", options.notes);
        }
        return runner.runJson(args);
      },
      delete: (id) => runner.runJson(["speakers", "delete", String(id)]),
      assign: (options) =>
        runner.runJson([
          "speakers",
          "assign",
          String(options.conversationId),
          options.speakerLabel,
          options.profileName,
        ]),
      identify: (conversationId) =>
        runner.runJson([
          "speakers",
          "identify",
          String(conversationId),
          "--json",
        ]),
      learn: (options) => {
        const args = ["speakers", "learn"];
        if (options?.profile) {
          args.push("--profile", options.profile);
        }
        if (options?.limit !== undefined) {
          args.push("--limit", String(options.limit));
        }
        return runner.runJson(args);
      },
    },
    cite: {
      show: (factId) =>
        runner.runJson(["cite", String(factId), "--json"]),
      search: (options) => {
        const args = ["cite", "search", "--query", options.query];
        if (options.limit !== undefined) {
          args.push("--limit", String(options.limit));
        }
        args.push("--json");
        return runner.runJson(args);
      },
      rebuild: () => runner.runJson(["cite", "rebuild", "--json"]),
    },
    infer: {
      run: (conversationId) =>
        runner.runJson(["infer", String(conversationId), "--json"]),
      list: (options) => {
        const args = ["infer", "list"];
        if (options?.conversationId !== undefined) {
          args.push("--conversation", String(options.conversationId));
        }
        args.push("--json");
        return runner.runJson(args);
      },
      clear: (options) => {
        const args = ["infer", "clear"];
        if (options?.conversationId !== undefined) {
          args.push("--conversation", String(options.conversationId));
        }
        return runner.runJson(args);
      },
    },
    integrations: {
      list: () => runner.runJson(["integrations", "list", "--json"]),
      remove: (name) => runner.runJson(["integrations", "remove", name]),
      test: (name) => runner.runJson(["integrations", "test", name]),
    },
    calendar: {
      list: () => runner.runJson(["calendar", "list", "--json"]),
      events: (options) => {
        const args = ["calendar", "events"];
        if (options?.from) {
          args.push("--from", options.from);
        }
        if (options?.to) {
          args.push("--to", options.to);
        }
        args.push("--json");
        return runner.runJson(args);
      },
    },
    mail: {
      recent: (options) => {
        const args = ["mail", "recent"];
        if (options?.limit !== undefined) {
          args.push("--limit", String(options.limit));
        }
        args.push("--json");
        return runner.runJson(args);
      },
      search: (options) => {
        const args = ["mail", "search", "--query", options.query];
        if (options.provider) {
          args.push("--provider", options.provider);
        }
        if (options.limit !== undefined) {
          args.push("--limit", String(options.limit));
        }
        args.push("--json");
        return runner.runJson(args);
      },
    },
  };
}

function appendListOptions(args: string[], options?: ListOptions): void {
  if (options?.limit !== undefined) {
    args.push("--limit", String(options.limit));
  }
  if (options?.cursor) {
    args.push("--cursor", options.cursor);
  }
}
