export function extent(nums: Iterable<number>) {
  let minMax: [number, number] | null = null;
  for (const num of nums) {
    minMax = minMax ? [Math.min(minMax[0], num), Math.max(minMax[1], num)] : [num, num];
  }
  return minMax;
}

export function range(nums: Iterable<number>): number | null {
  const span = extent(nums);
  if (!span) return null;
  const [min, max] = span;
  return max - min;
}

export interface UserInfo { id: string; name: string }
export interface Post { title: string; publishedAt: number }
export interface Api {
  fetchUser(id: string): Promise<UserInfo>;
  fetchPosts(id: string): Promise<Post[]>;
}

/** Un profil n'existe qu'une fois toutes ses données chargées : aucun champ nullable. */
export class Profile {
  readonly user: UserInfo;
  readonly posts: readonly Post[];

  constructor(user: UserInfo, posts: readonly Post[]) {
    this.user = user;
    this.posts = posts;
  }

  static async load(userId: string, api: Api): Promise<Profile> {
    const [user, posts] = await Promise.all([api.fetchUser(userId), api.fetchPosts(userId)]);
    return new Profile(user, posts);
  }

  summary(): string {
    return `${this.user.name} (${this.posts.length} billets)`;
  }

  latestTitle(): string | null {
    return this.posts.toSorted((a, b) => b.publishedAt - a.publishedAt)[0]?.title ?? null;
  }
}
