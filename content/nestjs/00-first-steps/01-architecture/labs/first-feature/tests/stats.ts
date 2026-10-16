import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { QuotesModule, QuotesService } from './quotes.js';

/** Module déjà écrit : il a besoin du QuotesService exporté par QuotesModule. */
@Injectable()
export class StatsService {
  constructor(readonly quotes: QuotesService) {}
  authors() {
    return new Set(this.quotes.findAll().map((q) => q.author)).size;
  }
}

@Controller('stats')
export class StatsController {
  constructor(private readonly stats: StatsService) {}
  @Get()
  get() {
    return { authors: this.stats.authors() };
  }
}

@Module({ imports: [QuotesModule], controllers: [StatsController], providers: [StatsService] })
export class StatsModule {}

@Module({ imports: [QuotesModule, StatsModule] })
export class AppModule {}
