import { Injectable } from '@nestjs/common';

@Injectable()
export class Clock {
  now(): Date {
    return new Date('2026-10-17T09:00:00Z');
  }
}
