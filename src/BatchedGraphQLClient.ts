import { Options, Variables } from './types'
import 'cross-fetch/polyfill'
import * as DataLoader from 'dataloader'
import { ClientError } from './ClientError'

export class BatchedGraphQLClient {
  public uri: string
  public options: Options
  private dataloader: DataLoader<string, any>

  constructor(uri: string, options?: Options) {
    this.uri = uri
    this.options = options || {}
    this.dataloader = new DataLoader(this.load, { cache: false })
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

    if (Array.isArray(results)) {
      const allResultsHaveData =
        results.filter(r => r.data).length === results.length

      if (response.ok && !results.find(r => r.errors) && allResultsHaveData) {
        return results.map(r => r.data)
      } else {
        const errorIndex = results.findIndex(r => r.errors)
        const result = results[errorIndex]
        const errorResult =
          typeof result === 'string' ? { error: result } : result
        throw new ClientError({ ...errorResult, status: response.status })
      }
    } else {
      // if it is not an array, there must be an error
      throw new ClientError({ ...results, status: response.status })
    }
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
