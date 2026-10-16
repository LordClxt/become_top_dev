import {
  Body, ConflictException, Controller, Get, Header, HttpCode, NotFoundException, Param,
  ParseEnumPipe, ParseUUIDPipe, Post, Query, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { type Order, OrderNotFoundError, OrderShippedError, OrdersService, OrderStatus } from './orders.service.js';

export const CreateOrder = z.object({
  items: z
    .array(z.object({ isbn: z.string().regex(/^97[89]-\d{10}$/), qty: z.number().int().min(1).max(10) }))
    .min(1)
    .max(20),
});
export type CreateOrder = z.infer<typeof CreateOrder>;

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  create(@Body({ schema: CreateOrder }) body: CreateOrder, @Res({ passthrough: true }) res: Response): Order {
    const order = this.orders.create(body.items);
    res.location(`/orders/${order.id}`);
    return order;
  }

  @Get()
  list(@Query('status', new ParseEnumPipe(OrderStatus, { optional: true })) status?: OrderStatus): Order[] {
    return this.orders.list(status);
  }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  findOne(@Param('id', ParseUUIDPipe) id: string): Order {
    const order = this.orders.find(id);
    if (!order) throw new NotFoundException(`Commande ${id} introuvable`);
    return order;
  }

  @Post(':id/cancel')
  @HttpCode(200)
  cancel(@Param('id', ParseUUIDPipe) id: string): Order {
    try {
      return this.orders.cancel(id);
    } catch (e) {
      if (e instanceof OrderNotFoundError) throw new NotFoundException(`Commande ${id} introuvable`);
      if (e instanceof OrderShippedError) throw new ConflictException(`La commande ${id} est déjà expédiée`);
      throw e;
    }
  }
}
