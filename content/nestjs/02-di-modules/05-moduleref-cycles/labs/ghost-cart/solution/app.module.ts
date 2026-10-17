import { Module } from '@nestjs/common';
import { CartModule } from './cart.js';
import { StatsModule } from './stats.js';

@Module({ imports: [CartModule, StatsModule] })
export class AppModule {}
