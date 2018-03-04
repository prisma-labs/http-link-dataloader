import { GraphQLResponse, GraphQLRequestContext } from './types'

export class ClientError extends Error {
  result: GraphQLResponse

  constructor(result: GraphQLResponse) {
    const message = ClientError.extractMessage(result)

    super(message)

    this.result = result

    // this is needed as Safari doesn't support .captureStackTrace
    /* tslint:disable-next-line */
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ClientError)
    }
  }

  private static extractMessage(response: GraphQLResponse): string {
    try {
      return response.errors![0].message
    } catch (e) {
      return `GraphQL Error: ${JSON.stringify(response, null, 2)}`
    }
  }
}
