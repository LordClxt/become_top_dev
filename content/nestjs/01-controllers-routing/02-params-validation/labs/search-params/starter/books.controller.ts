import { BadRequestException, Body, Controller, DefaultValuePipe, Get, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { BooksService } from './books.service.js';

// TODO : title et author non vides, year entier entre 1450 et 2100
export const CreateBook = z.object({});
export type CreateBook = z.infer<typeof CreateBook>;

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  // TODO : GET /books (recherche paginée), GET /books/:id, POST /books
}
