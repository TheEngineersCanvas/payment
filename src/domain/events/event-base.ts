export interface EventBase {
  readonly type: string;
  readonly occurredAt: Date;
  readonly correlationId: string;
}
