import { AxiosError, type AxiosResponse } from 'axios'

/** stolen from: axios/lib/core/settle.js:17:12 */
export const createAxiosError = (response: AxiosResponse): AxiosError =>
  new AxiosError(
    `Request failed with status code ${response.status}`,
    [AxiosError.ERR_BAD_REQUEST, AxiosError.ERR_BAD_RESPONSE][Math.floor(response.status / 100) - 4],
    response.config,
    response.request,
    response
  )
