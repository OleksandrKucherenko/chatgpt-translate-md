// noinspection JSUnusedGlobalSymbols

import type prompts from 'prompts'
import type yargs from 'yargs'
import { type AllFlags, type Routes } from './routes'

type Simple = string | number | symbol

type SimpleEnum = { [key in Simple]: Simple }

type Resolved = string | number | boolean

type Common = undefined | null | Resolved

export interface Question extends Omit<prompts.PromptObject, `type` | `name`> {
  message: string
  /** default is 'text' */
  type?: prompts.PromptType
}

/**
 * Sample usage:
 * <pre>
 *   // declare enum with possible choices
 *   enum BucketChoices {
 *     auto = `auto`,
 *     one = `1`,
 *     two = `2`,
 *     four = `4`,
 *     eight = `8`,
 *     max = `16`,
 *   }
 *
 *  const Prompts: Questions = {
 *    // use enum to generate choices
 *    buckets: Choices.from({ message: `Number of buckets to use`, }, BucketChoices),
 *  }
 * </pre>
 * */
export class Choices implements Question {
  // @ts-expect-error message property assigned via Object.assign(this, props)
  message: string
  type: `select`

  private constructor(props: Omit<Question, `type`>) {
    this.type = `select`
    Object.assign(this, props)
  }

  static from<T>({ message }: Question, type: SimpleEnum & T): Choices {
    // TODO (olku): use enum 'key' as a value and enum 'value' as a title
    const choices = Object.values(type)
      .filter((x) => typeof x === `string`)
      .map((x) => ({ title: x, value: x })) as prompts.Choice[]

    return new Choices({ message, choices, initial: 0 })
  }
}

/**
 * Sample usage:
 * <pre>
 *   const Prompts: Questions = {
 *    // parameters is a secret and should be masked/hidden
 *    token: Secret.from({ message: `OpenAI ChatGPT API Access Token`, }),
 *    }
 * </pre>
 * */
export class Secret implements Question {
  // @ts-expect-error message property assigned via Object.assign(this, props)
  message: ``
  type: `password`

  private constructor(props: Omit<Question, `type`>) {
    this.type = `password`
    Object.assign(this, props)
  }

  static from({ message }: Question): Secret {
    return new Secret({ message })
  }
}

export interface Switch extends yargs.Options {
  describe: string
}

export class Secured implements Switch {
  // @ts-expect-error describe property assigned via Object.assign(this, props)
  describe: ``
  secret: true

  private constructor(props: Omit<Switch, `secret`>) {
    this.secret = true
    Object.assign(this, props)
  }

  static from(props: Omit<Switch, `secret`>): Secured {
    return new Secured({ defaultDescription: `<masked>`, ...props })
  }
}

export interface Command {
  aliases?: string[]
  description: string

  /** Specify the order of options */
  options: AllFlags[]
  /** Specify the order of confirmation questions */
  questions?: AllFlags[]
}

export type NonEmptyArray<T> = [T, ...T[]]

export type Predefined = Partial<Record<`${AllFlags}`, Common[]>>

export type Questions = Partial<Record<`${AllFlags}`, Question>>

export type Switches = Partial<Record<`${AllFlags}`, Switch>>

export type Commands = Record<`${Routes}`, Command>

// eslint-disable-next-line @typescript-eslint/no-namespace,@typescript-eslint/no-unused-vars
export interface Arguments extends Record<`${AllFlags}`, Resolved> {
  ask: boolean
  command: Routes
}

export type Extras = {
  [key in keyof Switch]?: Switch[key]
}
