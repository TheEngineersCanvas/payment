import type { Metadata } from "../metadata/metadata.js";

export interface Customer {
  readonly id: string;
  readonly email: string;
  readonly phone?: string;
  readonly name?: string;
  readonly metadata?: Metadata;
}
