import pkg from "../package.json"

// next.config.ts inject qilghan (git commit sani). Env oqulmisa, package.json version'i yedek.
export const APP_VERSION: string = process.env.NEXT_PUBLIC_APP_VERSION || pkg.version
export const APP_COMMIT: string = process.env.NEXT_PUBLIC_APP_COMMIT || ""
