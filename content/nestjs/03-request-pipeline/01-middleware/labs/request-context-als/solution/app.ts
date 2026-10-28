import { Controller, Get, Injectable, Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import { RequestContext, RequestIdMiddleware } from './context.js';

/** Un service profond, singleton, qui journalise avec l'identifiant de requête. */
@Injectable()
export class AuditService {
  static instances = 0;
  readonly lines: string[] = [];
  constructor(private readonly ctx: RequestContext) {
    AuditService.instances++;
  }
  async record(event: string): Promise<void> {
    await new Promise((r) => setTimeout(r, 20)); // un appel lent : les requêtes se chevauchent
    this.lines.push(`[${this.ctx.requestId}] ${event}`);
  }
}

@Controller('orders')
export class OrdersController {
  constructor(private readonly audit: AuditService, private readonly ctx: RequestContext) {}
  @Get()
  async list() {
    await this.audit.record('liste des commandes');
    return { requestId: this.ctx.requestId };
  }
}

@Module({ controllers: [OrdersController], providers: [RequestContext, AuditService] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
