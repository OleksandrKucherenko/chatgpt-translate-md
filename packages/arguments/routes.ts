/** enum of supported command line commands. Each command should correspond specific flags enum.
 * translate ~> TranslateFlags
 * */
export enum Routes {
  translate = `translate`,
}

/** Global flags that available for all commands. */
export enum GlobalFlags {
  token = `token`,
  /** --ask and --no-ask - interactive and non-interactive */
  ask = `ask`,
}

/** Translate specific flags. */
export enum TranslateFlags {
  /** source files glob */
  source = `source`,
  /** Boolean, overwrite source files or compose with language extension. */
  overwrite = `overwrite`,
  /** Target language. */
  language = `language`,
}

export type AllFlags = GlobalFlags | TranslateFlags
