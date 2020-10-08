import { Options, Variables } from './types'
import 'cross-fetch/polyfill'
import * as DataLoader from 'dataloader'
import { ClientError } from './ClientError'
import { ClientOptions } from '.'

export class BatchedGraphQLClient {
  public uri: string
  public options: Options
  private dataloader: DataLoader<string, any>

  constructor(uri: string, options?: Options & ClientOptions) {
    this.uri = uri

    const cache =
      options && typeof options.cacheResults !== 'undefined'
        ? options.cacheResults
        : false

    if (options && typeof options.cacheResults !== 'undefined') {
      delete options.cacheResults
    }
    
    const maxBatchSize =
      options && typeof options.maxBatchSize !== 'undefined'
        ? options.maxBatchSize
        : null

    if (options && typeof options.maxBatchSize !== 'undefined') {
      delete options.maxBatchSize
    }

    this.options = options || {}
    this.dataloader = new DataLoader(this.load, { cache, maxBatchSize })
  }

  async request<T extends any>(
    query: string,
    variables?: Variables,
    operationName?: string,
  ): Promise<T> {
    const body = JSON.stringify({
      query,
      variables: variables ? variables : undefined,
      operationName: operationName ? operationName : undefined,
    })
    return this.dataloader.load(body)
  }

  load = async (keys: string[]): Promise<any> => {
    const requests = keys.map(k => JSON.parse(k))
    const body = JSON.stringify(requests)

    const response = await fetch(this.uri, {
      method: 'POST',
      ...this.options,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        this.options.headers,
      ),
      body,
    })

    const results = await getResults(response)

    // if it is not an array, there must be an error
    if (!Array.isArray(results)) {
      let errorDetails;

      if (typeof results === "string") {
        errorDetails = {
          errors: [{ message: `Invalid response: ${results}` }]
        }
      } else {
        errorDetails = results;
      }
      throw new ClientError({
        ...errorDetails,
        status: response.status
      })
    }

    // check if there was an error in one of the responses
    if (
      !response.ok ||
      results.some(r => r.errors !== undefined || r.data === undefined)
    ) {
      const errorIndex = results.findIndex(
        r => r.errors !== undefined || r.data === undefined,
      )
      const result = results[errorIndex]
      const errorResult =
        typeof result === 'string' ? { errors: [{ message: result }] } : result

      throw new ClientError({ ...errorResult, status: response.status })
    }

    return results.map(r => r.data)
  }
}

function getResults(response: Response): Promise<any> {
  const contentType = response.headers.get('Content-Type')
  if (contentType && contentType.startsWith('application/json')) {
    return response.json()
  } else {
    return response.text()
  }
}
