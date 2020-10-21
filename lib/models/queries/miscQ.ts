export const DOC: string = "d";

/**
 * @description right now we assume that
 * 
 *  - the string for document is "d"
 *  - the search keywords are in a variable "keywords"
 *  - the boost keyword is the first entry in "keywords"
 * 
 * @todo OMG this is string-based over-bullshit !!
 *       -> URGENTLY find a way to make this better !!
 */
export function getSearchTextBlock(attrs: string[], d: string) {
  let searchBlock = "SEARCH ANALYZER(";
  searchBlock += attrs.map(a => `${d}['${a}'] IN keywords`).join(" OR ");
  searchBlock += ` OR BOOST(${d}['${attrs[0]}'] == keywords[0], 2)`;
  searchBlock += ", 'text_en')";
  return searchBlock;
}
