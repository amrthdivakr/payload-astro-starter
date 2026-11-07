declare namespace App {
  interface Locals {
    /** Locale of this request (one of the site's `locales`). Set by the catch-all route. */
    locale: string;
    /** `/{locale}` on a multi-locale site, `''` otherwise. Links pass it to `hrefFromLink`. */
    prefix: string;
    /** Id of the doc being rendered, when found. The listing block passes it as `parent`. */
    docId?: number;
  }
}
