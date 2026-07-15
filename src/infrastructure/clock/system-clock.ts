import type { Clock } from "../../application/ports/clock.js";

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
}

export class FixedClock implements Clock {
  private readonly time: Date;

  constructor(time: Date | string | number) {
    this.time = new Date(time);
  }

  now(): Date {
    return new Date(this.time.getTime());
  }
}
