import { Controller, Get, Injectable, Module } from '@nestjs/common';

const QUOTES = [
  { id: 1, author: 'Victor Hugo', text: 'Ceux qui vivent, ce sont ceux qui luttent.' },
  { id: 2, author: 'Albert Camus', text: "Il faut imaginer Sisyphe heureux." },
  { id: 3, author: 'Simone Weil', text: "L'attention est la forme la plus rare et la plus pure de la générosité." },
];

// TODO : rendre ce service injectable.
export class QuotesService {
  findAll() {
    return QUOTES;
  }

  count() {
    return QUOTES.length;
  }
}

// TODO : exposer GET /quotes et GET /quotes/count, en recevant QuotesService par le constructeur.
export class QuotesController {
  findAll(): unknown {
    throw new Error('TODO: GET /quotes');
  }

  count(): unknown {
    throw new Error('TODO: GET /quotes/count');
  }
}

// TODO : déclarer le contrôleur, le service, et partager le service avec les autres modules.
@Module({})
export class QuotesModule {}
