## Hint 1
Chaque point correspond à une des formes vues dans la leçon : un setter écrit à la main, une propriété `final`, une propriété calculée.

## Hint 2
Écris `void setEmail(String e)`. Dans son corps, `email = …` désigne le champ (tu es dans la classe) : pas de boucle infinie. Le constructeur nommé appelle ce setter.

## Hint 3
`final String id = 'acc-' + UUID.randomUUID().toString().take(8)` ; et `String getDisplayName()` qui renvoie `email ? "$name <$email>" : name`, sans déclarer de champ `displayName`.
