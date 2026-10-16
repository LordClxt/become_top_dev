import { Body, ConflictException, Controller, Delete, Get, HttpCode, NotFoundException, Param, Post, Put, Res } from '@nestjs/common';
import type { Response } from 'express';
import { type Book, BooksService } from './books.service.js';

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  // TODO : GET /books, GET /books/:isbn, POST /books, PUT /books/:isbn, DELETE /books/:isbn
}
