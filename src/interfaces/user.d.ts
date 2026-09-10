export interface User {
  id?: string;
  username?: string;
  display_name?: string;
  email?: string;
  avatar_url?: string;
  external_urls?: {
    spotify: string;
  };
  href?: string;
  images?: Array<{
    url: string;
    height?: number;
    width?: number;
  }>;
  type?: string;
  uri?: string;
  followers?: {
    href: null;
    total: number;
  };
  country?: string;
  product?: string;
  explicit_content?: {
    filter_enabled: boolean;
    filter_locked: boolean;
  };
}
