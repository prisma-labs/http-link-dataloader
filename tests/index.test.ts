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

test('unexpected responses provide useful errors', async t => {
  const client = new BatchedGraphQLClient('https://test.localhost/graphql1')

  fetchMock.mock({
    matcher: 'https://test.localhost/graphql1',
    response: {
      headers: { 'Content-Type': 'text/html' },
      body: "<html>foo!</html>",
    },
  })

  const error = await t.throws(client.request('{ test }'))
  t.is(error.message, "Invalid response: <html>foo!</html>")
})

test('graphql errors', async t => {
  const client = new BatchedGraphQLClient('https://test.localhost/graphql2')

  fetchMock.mock({
    matcher: 'https://test.localhost/graphql2',
    response: {
      headers: { 'Content-Type': 'application/json' },
      body: [
        { data: { test: 'test' } },
        { errors: [{ message: 'it is on fire' }] }
      ],
    },
  })

  const error = await t.throws(client.request('{ test }'))
  t.is(error.message, 'it is on fire')
})

test('strange JSON errors', async t => {
  const client = new BatchedGraphQLClient('https://test.localhost/graphql3')

  fetchMock.mock({
    matcher: 'https://test.localhost/graphql3',
    response: {
      headers: { 'Content-Type': 'application/json' },
      body: {
        message: 'Something went wrong!',
        errors: [{ message: 'it broke' }]
      },
    },
  })

  const error = await t.throws(client.request('{ test }'))
  t.is(error.message, 'it broke')
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
