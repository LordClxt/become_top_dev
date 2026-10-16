import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller.js';
import { CatalogService } from './catalog.service';

@Module({ controllers: [CatalogController], providers: [CatalogService] })
export class AppModule {}
