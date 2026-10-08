// Atom feed of news, English (see src/site/feed.ts).
import { atom } from '../site/feed';
export const GET = () => atom('en');
