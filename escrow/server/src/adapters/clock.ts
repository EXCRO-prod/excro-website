// Real time plus a dev-only offset the simulator can advance (specs: Clock adapter).
export interface Clock {
  now(): Date;
}

export class DevClock implements Clock {
  private offsetMs = 0;
  now(): Date {
    return new Date(Date.now() + this.offsetMs);
  }
  advance(ms: number): void {
    if (ms < 0) throw new Error("clock only moves forward");
    this.offsetMs += ms;
  }
}

/** Fixed clock for tests. */
export class FixedClock implements Clock {
  constructor(private t: Date) {}
  now(): Date {
    return new Date(this.t);
  }
  advance(ms: number): void {
    this.t = new Date(this.t.getTime() + ms);
  }
}
