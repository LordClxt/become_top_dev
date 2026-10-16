import { BadRequestException, Body, Controller, DefaultValuePipe, Get, NotFoundException, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { z } from 'zod';
import { BooksService } from './books.service.js';

export const CreateBook = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  year: z.number().int().min(1450).max(2100),
});
export type CreateBook = z.infer<typeof CreateBook>;

const MAX_LIMIT = 50;

@Controller('books')
export class BooksController {
  constructor(private readonly books: BooksService) {}

  @Get()
  search(
    @Query('author') author: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    if (page < 1) throw new BadRequestException('page doit être ≥ 1');
    if (limit < 1 || limit > MAX_LIMIT) throw new BadRequestException(`limit doit être entre 1 et ${MAX_LIMIT}`);
    const needle = author?.toLowerCase();
    const matches = needle
      ? this.books.all().filter((b) => b.author.toLowerCase().includes(needle))
      : this.books.all();
    return { items: matches.slice((page - 1) * limit, page * limit), page, limit, total: matches.length };
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    const book = this.books.find(id);
    if (!book) throw new NotFoundException(`Livre ${id} introuvable`);
    return book;
  }

  @Post()
  create(@Body({ schema: CreateBook }) body: CreateBook) {
    return this.books.add(body);
  }
}
