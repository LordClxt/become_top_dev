import {
  BadRequestException, Controller, Delete, Get, HttpCode, Module, Param, UseGuards, UseInterceptors,
  type MiddlewareConsumer, type NestModule,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { ApiKeyMiddleware, Roles, RolesGuard } from './auth.js';
import { ErrorEnvelopeFilter } from './errors.filter.js';
import { TimingInterceptor } from './timing.js';

/** Incident n°1 : un filtre lié au contrôleur ne voit pas les erreurs des middlewares ; il doit être global. */
@Controller('books')
@Roles(['staff'])
@UseGuards(RolesGuard)
@UseInterceptors(TimingInterceptor)
export class BooksController {
  @Get() list() { return ['Germinal']; }

  @Get('bad') bad() { throw new BadRequestException('requête invalide'); }

  @Roles(['admin'])
  @Delete(':isbn')
  @HttpCode(204)
  remove(@Param('isbn') _isbn: string) {}
}

@Module({ controllers: [BooksController], providers: [{ provide: APP_FILTER, useClass: ErrorEnvelopeFilter }] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(ApiKeyMiddleware).forRoutes('*path');
  }
}
