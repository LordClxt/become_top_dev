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

@Module({ controllers: [HelloController], providers: [HelloService] })
export class AppModule {}
