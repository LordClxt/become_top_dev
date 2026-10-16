import { Controller, Get, Injectable, Module } from '@nestjs/common';

const QUOTES = [
  { id: 1, author: 'Victor Hugo', text: 'Ceux qui vivent, ce sont ceux qui luttent.' },
  { id: 2, author: 'Albert Camus', text: "Il faut imaginer Sisyphe heureux." },
  { id: 3, author: 'Simone Weil', text: "L'attention est la forme la plus rare et la plus pure de la générosité." },
];

@Injectable()
export class QuotesService {
  findAll() {
    return QUOTES;
  }

  count() {
    return QUOTES.length;
  }
}

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  findAll() {
    return this.quotes.findAll();
  }

  @Get('count')
  count() {
    return { count: this.quotes.count() };
  }
}

@Module({
  controllers: [QuotesController],
  providers: [QuotesService],
  exports: [QuotesService],
})
export class QuotesModule {}
