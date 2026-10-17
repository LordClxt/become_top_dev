## Hint 1
Écris de petits convertisseurs : `toDate(value: Date | string, field)`, `toGuests(value: number | string)`, `toRoom(value: string)`.

## Hint 2
Contact : `const email = input.email?.trim() || undefined;` puis `...(email || phone ? { contact: { ...(email ? { email } : {}), ...(phone ? { phone } : {}) } } : {})`.

## Hint 3
Nuits : `(checkOut.getTime() - checkIn.getTime()) / 86_400_000`.
