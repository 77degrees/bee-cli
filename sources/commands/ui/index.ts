import type { Command } from "@/commands/types";
import { startServer } from "./server";

const USAGE = "bee ui [--port N]";

export const uiCommand: Command = {
  name: "ui",
  description: "Open the Bee dashboard in your browser.",
  usage: USAGE,
  run: async (args, context) => {
    let port = 3773;

    for (let i = 0; i < args.length; i += 1) {
      const arg = args[i];
      if (arg === "--port") {
        const value = args[i + 1];
        if (value === undefined) {
          throw new Error("--port requires a value");
        }
        const parsed = Number.parseInt(value, 10);
        if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 65535) {
          throw new Error("--port must be a valid port number");
        }
        port = parsed;
        i += 1;
        continue;
      }
      if (arg?.startsWith("-")) {
        throw new Error(`Unknown option: ${arg}`);
      }
      throw new Error(`Unexpected argument: ${arg}`);
    }

    await startServer(context, port);
  },
};
