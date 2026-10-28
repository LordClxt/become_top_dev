import { Controller, Get, Module, type MiddlewareConsumer, type NestModule } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Controller('books') export class BooksController { @Get() list() { return []; } }
@Controller('health') export class HealthController { @Get() get() { return { status: 'ok' }; } }

/** Ajoute l'en-tête `x-shop: librairie` à la réponse. */
export function shopHeader(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('x-shop', 'librairie');
  next();
}

@Module({ controllers: [BooksController, HealthController] })
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(shopHeader).forRoutes(BooksController);
  }
}
