/** Name of our tool. */
export const ApplicationName = `cli-gpt`

export const ApplicationVersion = `0.0.1`

/** enum of supported command line commands. Each command should correspond specific flags enum.
 * translate ~> TranslateFlags
 * */
export enum Routes {
  translate = `translate`,
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
  /** ignore files glob */
  ignore = `ignore`,
  /** Boolean, overwrite source files or compose with language extension. */
  overwrite = `overwrite`,
  /** Target language. */
  language = `language`,
}

export type AllFlags = GlobalFlags | TranslateFlags
