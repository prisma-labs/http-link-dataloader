import { ClientError, Options, Variables } from './types'
import 'cross-fetch/polyfill'
import * as DataLoader from 'dataloader'

export { ClientError } from './types'

export class BatchedGraphQLClient {
  public url: string
  public options: Options
  private dataloader: DataLoader<string, any>

  constructor (url: string, options?: Options) {
    this.url = url
    this.options = options || {}
    this.dataloader = new DataLoader(this.load)
  }

  async request<T extends any> (
    query: string,
    variables?: Variables,
  ): Promise<T> {
    const body = JSON.stringify({
      query,
      variables: variables ? variables : undefined,
    })
    return this.dataloader.load(body)
  }

  load = async (keys: string[]): Promise<any> => {
    const requests = keys.map(k => JSON.parse(k))
    const body = JSON.stringify(requests)

    const response = await fetch(this.url, {
      method: 'POST',
      ...this.options,
      headers: Object.assign(
        { 'Content-Type': 'application/json' },
        this.options.headers,
      ),
      body,
    })

    const results = await getResults(response)!

    const allResultsHaveData =
      results.filter(r => r.data).length === results.length

    if (response.ok && !results.find(r => r.errors) && allResultsHaveData) {
      return results.map(r => r.data)
    } else {
      const errorIndex = results.findIndex(r => r.errors)
      const result = results[errorIndex]
      const { query, variables } = requests[errorIndex]
      const errorResult =
        typeof result === 'string' ? { error: result } : result
      throw new ClientError(
        { ...errorResult, status: response.status },
        { query, variables },
      )
    }
  }
}

async function getResults (response: Response): Promise<any> {
  const contentType = response.headers.get('Content-Type')
  if (contentType && contentType.startsWith('application/json')) {
    return await response.json()
  } else {
    return await response.text()
  }
}
