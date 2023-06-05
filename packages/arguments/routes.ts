
/** Name of our tool. */
export const ApplicationName = `cli-gpt`

export const ApplicationVersion = `0.1.0`

/** enum of supported command line commands. Each command should correspond specific flags enum.
 * translate ~> TranslateFlags
 * */
export enum Routes {
  translate = `translate`,
}

/** Hidden flags that available for all commands in runtime only. Not designed for user input. */
export enum HiddenFlags {
  /** Unique identifier of the current session. */
  session = `session`,
}

/** Global flags that available for all commands. */
export enum GlobalFlags {
  /** OpenAI api token. */
  token = `token`,
  /** --ask and --no-ask - interactive and non-interactive */
  ask = `ask`,
  /** enable debug mode of the tool, the same can be achieved by `DEBUG=*` */
  debug = `debug`,
  /** current working directory */
  cwd = `cwd`,
}

/** Translate specific flags. */
export enum TranslateFlags {
  /** source files glob */
  source = `source`,
  /** treat `source` as a list of files/globs. */
  list = `list`,
  /** ignore files glob */
  ignore = `ignore`,
  /** Boolean, overwrite source files or compose with language extension. */
  overwrite = `overwrite`,
  /** Target language. */
  language = `language`,
}

/** All flags that available for all commands. */
export type AllFlags = HiddenFlags | GlobalFlags | TranslateFlags
