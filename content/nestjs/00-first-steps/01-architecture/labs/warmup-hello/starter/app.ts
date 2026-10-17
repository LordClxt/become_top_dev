import { Controller, Get, Injectable, Module } from '@nestjs/common';

@Injectable()
export class HelloService {
  hello(): string {
    return 'Bonjour de la librairie';
  }
}

@Controller('hello')
export class HelloController {
  constructor(private readonly hello: HelloService) {}
  @Get()
  get() {
    return { message: this.hello.hello() };
  }
}

// TODO : déclare le contrôleur et le service dans le module.
@Module({})
export class AppModule {}
