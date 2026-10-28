import {
  BadRequestException, Controller, Delete, Get, HttpCode, Module, Param, UseFilters, UseGuards, UseInterceptors,
  type MiddlewareConsumer, type NestModule,
} from '@nestjs/common';
import { ApiKeyMiddleware, Roles, RolesGuard } from './auth.js';
import { ErrorEnvelopeFilter } from './errors.filter.js';
import { TimingInterceptor } from './timing.js';

@Controller('books')
@Roles(['staff'])
@UseGuards(RolesGuard)
@UseInterceptors(TimingInterceptor)
@UseFilters(ErrorEnvelopeFilter)
export class BooksController {
  @Get() list() { return ['Germinal']; }

  @Get('bad') bad() { throw new BadRequestException('requête invalide'); }

  @Roles(['admin'])
  @Delete(':isbn')
  @HttpCode(204)
  remove(@Param('isbn') _isbn: string) {}
}

@Module({ controllers: [BooksController] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ApiKeyMiddleware).forRoutes('*path');
  }
}
