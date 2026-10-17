// TODO 1 : [min, max] | null — attention au 0.
export function extent(nums: Iterable<number>) {
  let min: number | undefined;
  let max: number | undefined;
  for (const num of nums) {
    if (!min) {
      min = num;
      max = num;
    } else {
      min = Math.min(min, num);
      max = Math.max(max ?? num, num);
    }
  }
  return [min, max];
}

// TODO 2 : max - min ou null (un seul test sur extent).
export function range(nums: Iterable<number>): number | null {
  throw new Error('TODO: range');
}

export interface UserInfo { id: string; name: string }
export interface Post { title: string; publishedAt: number }
export interface Api {
  fetchUser(id: string): Promise<UserInfo>;
  fetchPosts(id: string): Promise<Post[]>;
}

// TODO 3 et 4 : aucun champ nullable ; Profile.load charge en parallèle.
export class Profile {
  user: UserInfo | null = null;
  posts: Post[] | null = null;

  static async load(userId: string, api: Api): Promise<Profile> {
    throw new Error('TODO: load');
  }

  summary(): string {
    throw new Error('TODO: summary');
  }

  latestTitle(): string | null {
    throw new Error('TODO: latestTitle');
  }
}
