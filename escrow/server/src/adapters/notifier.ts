// Notifier adapter. Mock writes to the outbox table + console; Azure Communication Services later.
import type { Queryable } from "../db/types.js";

export interface Message {
  channel: "sms" | "email" | "whatsapp";
  to: string;
  subject: string;
  body: string;
}

export interface Notifier {
  send(q: Queryable, msg: Message, at: Date): Promise<void>;
}
