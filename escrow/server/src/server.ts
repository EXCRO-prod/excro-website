import { buildApp } from "./app.js";
import { DevClock } from "./adapters/clock.js";
import { MockKycProvider } from "./adapters/mock/mockKyc.js";
import { MockNotifier } from "./adapters/mock/mockNotifier.js";
import { loadConfig } from "./config.js";
import type { AppContext } from "./context.js";
import { openDb } from "./db/index.js";
import { seedStaff } from "./staff/service.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const db = await openDb(config);
  const clock = new DevClock();
  await db.tx((q) => seedStaff(q, clock.now()));
  const ctx: AppContext = { db, clock, notifier: new MockNotifier(), kyc: new MockKycProvider(), config };
  const { app } = buildApp(ctx);
  await app.listen({ port: config.port, host: "0.0.0.0" });
  // eslint-disable-next-line no-console
  console.log(`Excro Conditional Release server on http://localhost:${config.port} (mock mode, KYC_GATE=${config.kycGate})`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
