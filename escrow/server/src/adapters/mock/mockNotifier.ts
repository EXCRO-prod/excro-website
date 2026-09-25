import type { Queryable } from "../../db/types.js";
import type { Message, Notifier } from "../notifier.js";

/** Dev/demo only: OTP codes and invite links land in `mock_outbox` (and the console) instead of a real channel. */
export class MockNotifier implements Notifier {
  constructor(private readonly log: (line: string) => void = (l) => console.log(l)) {}
  async send(q: Queryable, msg: Message, at: Date): Promise<void> {
    await q.query("insert into mock_outbox (channel, to_addr, subject, body, created_at) values ($1,$2,$3,$4,$5)", [msg.channel, msg.to, msg.subject, msg.body, at.toISOString()]);
    this.log(`[mock ${msg.channel}] to ${msg.to}: ${msg.subject} | ${msg.body}`);
  }
}
