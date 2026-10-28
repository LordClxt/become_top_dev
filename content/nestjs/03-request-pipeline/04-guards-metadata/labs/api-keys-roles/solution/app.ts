import { Controller, Delete, Get, HttpCode, Module, Param } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ApiKeyGuard, Auth, CurrentUser, Public, Roles, RolesGuard } from './auth.js';
import type { User } from './users.js';

@Controller('catalog')
@Roles(['staff'])
export class CatalogController {
  @Public()
  @Get()
  list() { return ['Germinal', 'Bel-Ami']; }

  @Get('stock')
  stock(@CurrentUser('name') name: string) { return { by: name, stock: 12 }; }

  @Roles(['admin'])
  @Delete(':isbn')
  @HttpCode(204)
  remove(@Param('isbn') _isbn: string) {}
}

@Controller('me')
export class MeController {
  @Auth('reader', 'staff')
  @Get()
  me(@CurrentUser() user: User) { return user; }
}

@Module({
  controllers: [CatalogController, MeController],
  providers: [{ provide: APP_GUARD, useClass: ApiKeyGuard }, { provide: APP_GUARD, useClass: RolesGuard }],
})
export class AppModule {}
