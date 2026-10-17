## Hint 1
Il y a quatre formes de provider : `useValue`, `useClass`, `useFactory` et `useExisting`. Chaque ligne du tableau correspond à l'une d'elles.

## Hint 2
Une fabrique peut être `async` : Nest attend la promesse avant de construire ceux qui en dépendent. Pour la passerelle, `useFactory: (config: PaymentsConfig) => …` avec `inject: [PAYMENTS_CONFIG]`.

## Hint 3
`{ provide: LEGACY_GATEWAY, useExisting: PaymentGateway }`. Avec `useClass: FakeGateway` à la place, tu obtiendrais une **seconde** instance.
