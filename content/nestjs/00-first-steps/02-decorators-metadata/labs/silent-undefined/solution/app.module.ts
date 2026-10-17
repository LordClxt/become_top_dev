import { Module } from '@nestjs/common';
import { BooksController } from './books.controller.js';
import { BooksService } from './books.service.js';
import { Clock } from './clock.js';
import { LatestService } from './latest.service.js';

@Module({ controllers: [BooksController], providers: [BooksService, Clock, LatestService] })
export class AppModule {}
