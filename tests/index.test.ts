import test from 'ava'
import * as fetchMock from 'fetch-mock'
import { BatchedGraphQLClient } from '../src/index'
import { Options } from '../src/types'

test('extra fetch options', async t => {
  const options: Options = {
    credentials: 'include',
    mode: 'cors',
    cache: 'reload',
  }

  const client = new BatchedGraphQLClient(
    'https://mock-api.com/graphql',
    options,
  )
  await mock(
    {
      body: [{ data: { test: 'test' } }],
    },
    async () => {
      await client.request('{ test }')
      const actualOptions = fetchMock.lastCall()[1]
      for (let name in options) {
        t.deepEqual(actualOptions[name], options[name])
      }
    },
  )
})

async function mock(response: any, testFn: () => Promise<void>) {
  fetchMock.mock({
    matcher: '*',
    response: {
      headers: {
        'Content-Type': 'application/json',
        ...response.headers,
      },
      body: JSON.stringify(response.body),
    },
  })

  await testFn()

  fetchMock.restore()
}
