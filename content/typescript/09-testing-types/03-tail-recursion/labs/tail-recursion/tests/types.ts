import type { Equals, Expect } from './expect.ts';
import { toSnake } from './recursion.ts';
import type { GetChars, Length, ToSnake } from './recursion.ts';

type Long = 'abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyzabcdefghij';
type LongCamel = 'aVeryLongIdentifierThatKeepsGoingAndGoingWellPastTheFiftyCharacterLimitOfNonTailRecursiveTypesInTypeScript';

const short = toSnake('userId');

export type Checks = [
  Expect<Equals<GetChars<'abc'>, 'a' | 'b' | 'c'>>,
  Expect<Equals<GetChars<Long>, 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'>>,
  Expect<Equals<Length<'hello'>, 5>>,
  Expect<Equals<Length<Long>, 114>>,
  Expect<Equals<ToSnake<'lastLoginAt'>, 'last_login_at'>>,
  Expect<Equals<ToSnake<LongCamel>, 'a_very_long_identifier_that_keeps_going_and_going_well_past_the_fifty_character_limit_of_non_tail_recursive_types_in_type_script'>>,
  Expect<Equals<ToSnake<string>, string>>,
  Expect<Equals<typeof short, 'user_id'>>,
];
