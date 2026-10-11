## Hint 1
XA n'est pas un service réseau : le coordinateur est une bibliothèque. Dans quel processus tourne-t-elle ?

## Hint 2
Il y a deux participants : la base et le broker. Le coordinateur parle aux deux (prepare, puis commit) ; eux ne se parlent pas.

## Hint 3
La décision doit survivre à un crash : elle va dans un journal durable, dans la même zone que le coordinateur, écrit par lui seul.
