/**
 * Metin hemishe toghra Uyghurche "ى" (U+0649) bilen saqlinidu.
 * Bu funksiya peqet bashqa yerdin (mes. eski saqlanghan maىlumat, Pársche
 * klaviatura, yapshurulghan tekist) kelgen Pársche "ی" (U+06CC) herpini
 * Uyghurche "ى" gha özgertidu.
 * Shrift (app/fonts/VazirmatnUG.woff2) U+0649 ni ىoghra sizidu.
 */
export const ug = (s: string) => s.replace(/\u06CC/g, "\u0649")
