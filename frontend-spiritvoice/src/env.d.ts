declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_DOTCMS_HOST: string;
    NEXT_PUBLIC_DOTCMS_AUTH_TOKEN: string;
    NEXT_PUBLIC_DOTCMS_SITE_ID?: string;
    NEXT_PUBLIC_SITE_URL?: string;
  }
}
