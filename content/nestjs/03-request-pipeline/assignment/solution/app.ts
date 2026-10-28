import {
  type CanActivate, ConflictException, Controller, Delete, type ExecutionContext, Get, HttpCode, Injectable, Module,
  NotFoundException, Param, Post, UnauthorizedException, type MiddlewareConsumer, type NestModule,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import type { Request } from 'express';
import { AuditLog, Audited } from './audit.js';
import { RequestContext, RequestIdMiddleware } from './context.js';

/** Un guard minimal : x-user donne l'utilisateur (le vrai vient au chapitre 07). */
@Injectable()
export class UserGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: { id: string } }>();
    const id = req.header('x-user');
    if (!id) throw new UnauthorizedException();
    req.user = { id };
    return true;
  }
}

@Controller('books')
export class BooksController {
  private readonly isbns = new Set(['978-2253004226', '978-2070413119']);

  @Get()
  list() { return [...this.isbns]; }

  @Audited('book.reserve')
  @Post(':isbn/reserve')
  async reserve(@Param('isbn') isbn: string) {
    await new Promise((r) => setTimeout(r, 15));
    if (!this.isbns.has(isbn)) throw new NotFoundException('Livre introuvable');
    if (isbn === '978-2070413119') throw new ConflictException('Déjà réservé');
    return { reserved: isbn };
  }

  @Audited('book.delete')
  @Delete(':isbn')
  @HttpCode(204)
  remove(@Param('isbn') isbn: string) {
    if (!this.isbns.delete(isbn)) throw new NotFoundException('Livre introuvable');
  }
}

@Module({
  controllers: [BooksController],
  providers: [RequestContext, AuditLog, { provide: APP_GUARD, useClass: UserGuard }],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*path');
  }
}
