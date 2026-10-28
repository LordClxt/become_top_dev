import { BadRequestException, Controller, Get, Injectable, Module, Param } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { CacheInterceptor, CacheTtl, TimingInterceptor } from './interceptors.js';
import { Clock, Metrics } from './support.js';

@Injectable()
export class CatalogService {
  calls = 0;
  bestsellers() {
    this.calls++;
    return ['Germinal', 'Bel-Ami'];
  }
}

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @CacheTtl(60_000)
  @Get('bestsellers')
  bestsellers() { return this.catalog.bestsellers(); }

  @Get('fresh')
  fresh() { return this.catalog.bestsellers(); }

  @Get('fail/:why')
  fail(@Param('why') why: string) { throw new BadRequestException(why); }
}

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService, Clock, Metrics,
    { provide: APP_INTERCEPTOR, useClass: TimingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: CacheInterceptor },
  ],
})
export class AppModule {}
