import {
  Body, ConflictException, Controller, Get, Header, HttpCode, NotFoundException, Param,
  ParseEnumPipe, ParseUUIDPipe, Post, Query, Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { z } from 'zod';
import { OrderNotFoundError, OrderShippedError, OrdersService, OrderStatus } from './orders.service.js';

// TODO : items (1 à 20 lignes), isbn ^97[89]-\d{10}$, qty entier de 1 à 10
export const CreateOrder = z.object({});
export type CreateOrder = z.infer<typeof CreateOrder>;

@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  // TODO : POST /orders, GET /orders/:id, GET /orders?status=, POST /orders/:id/cancel
}
