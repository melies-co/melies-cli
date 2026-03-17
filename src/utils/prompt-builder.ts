/**
 * Style options sent to the API. Modifiers are resolved server-side.
 */
export interface StyleOptions {
  camera?: string;
  shot?: string;
  expression?: string;
  lighting?: string;
  time?: string;
  weather?: string;
  colorGrade?: string;
  mood?: string;
  artStyle?: string;
  era?: string;
  movement?: string;
}
