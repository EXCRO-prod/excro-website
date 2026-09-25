import type { Clock } from "./adapters/clock.js";
import type { KycProvider } from "./adapters/kycProvider.js";
import type { Notifier } from "./adapters/notifier.js";
import type { Config } from "./config.js";
import type { Db } from "./db/types.js";

/** Everything a service needs. External systems appear here only as adapter interfaces. */
export interface AppContext {
  db: Db;
  clock: Clock;
  notifier: Notifier;
  kyc: KycProvider;
  config: Config;
}
