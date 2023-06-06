/* eslint-disable */

declare module 'axios/lib/core/createError' {
  const createError = (message: string, config: any, code: string | null, request: any, response: any) => Error

  export default createError
}
