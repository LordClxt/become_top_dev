import {
  BadRequestException, Controller, Get, Injectable, Module, NotFoundException, Param, UnauthorizedException,
  type MiddlewareConsumer, type NestMiddleware, type NestModule,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import type { NextFunction, Request, Response } from 'express';
import { OutOfStockError } from './domain.js';
import { ErrorEnvelopeFilter } from './errors.filter.js';

@Injectable()
export class BlockMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (req.header('x-banned')) throw new UnauthorizedException('Client banni');
    next();
  }
}

@Controller('books')
export class BooksController {
  @Get('missing') missing() { throw new NotFoundException('Livre introuvable'); }
  @Get('weak') weak() { throw new BadRequestException('Mot de passe trop faible', { errorCode: 'WEAK_PASSWORD' }); }
  @Get('stock/:isbn') stock(@Param('isbn') isbn: string) { throw new OutOfStockError(isbn); }
  @Get('crash') crash() { throw new Error('connection refused 10.0.3.7:5432'); }
  @Get('ok') ok() { return { ok: true }; }
}

@Module({ controllers: [BooksController], providers: [{ provide: APP_FILTER, useClass: ErrorEnvelopeFilter }] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(BlockMiddleware).forRoutes('*path');
  }
}
