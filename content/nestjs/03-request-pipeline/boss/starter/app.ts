import { Controller, Get, Module, Param } from '@nestjs/common';
import { CurrentPartner, PartnersModule, RawResponse, RequireScopes } from './partners.js';
import type { Partner } from './partners-data.js';

@Controller('partner')
@RequireScopes('catalog:read')
export class PartnerController {
  @Get('books')
  books() { return ['Germinal', 'Bel-Ami']; }

  @RequireScopes('stock:read')
  @Get('stock/:isbn')
  stock(@Param('isbn') isbn: string, @CurrentPartner() partner: Partner) {
    return { isbn, stock: 4, for: partner.id };
  }

  @RawResponse()
  @Get('ping')
  ping() { return 'pong'; }

  @Get('crash')
  crash() { throw new Error('ECONNREFUSED 10.0.0.12:6379'); }
}

@Module({ imports: [PartnersModule], controllers: [PartnerController] })
export class AppModule {}
