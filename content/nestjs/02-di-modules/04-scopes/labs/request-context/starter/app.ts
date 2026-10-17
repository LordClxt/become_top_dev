import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { AuditLogger, RequestContext } from './context.js';

/** Dépôt sans état par requête : doit rester un singleton. */
@Injectable()
export class CatalogRepository {
  static instances = 0;
  constructor() {
    CatalogRepository.instances++;
  }
  titles(): string[] {
    return ['Germinal', 'Bel-Ami'];
  }
}

@Injectable()
export class OrdersService {
  static instances = 0;
  constructor(
    private readonly ctx: RequestContext,
    private readonly repo: CatalogRepository,
    private readonly audit: AuditLogger,
  ) {
    OrdersService.instances++;
  }
  async summary() {
    await new Promise((r) => setTimeout(r, 30)); // une requête lente : les requêtes se chevauchent
    this.audit.log(`résumé pour ${this.ctx.requestId}`);
    return { requestId: this.ctx.requestId, titles: this.repo.titles() };
  }
}

@Controller('summary')
export class SummaryController {
  constructor(private readonly orders: OrdersService) {}
  @Get()
  get() {
    return this.orders.summary();
  }
}

@Module({ controllers: [SummaryController], providers: [OrdersService, CatalogRepository, RequestContext, AuditLogger] })
export class AppModule {}
