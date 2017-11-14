# batched-graphql-request [![Build Status](https://travis-ci.org/graphcool/batched-graphql-request.svg?branch=master)](https://travis-ci.org/graphcool/graphql-request) [![npm version](https://badge.fury.io/js/graphql-request.svg)](https://badge.fury.io/js/graphql-request) [![Greenkeeper badge](https://badges.greenkeeper.io/graphcool/graphql-request.svg)](https://greenkeeper.io/)

📚📡  Node-only, batched version of the graphql-request library 

## Features

* Most **simple and lightweight** GraphQL client
* Includes batching and caching based [`dataloader`](https://github.com/facebook/dataloader)
* Promise-based API (works with `async` / `await`)
* Typescript support (Flow coming soon)

## Idea
The idea of this library is to provide query batching and caching for Node.js backends on a per-request basis.
That means, per http request to your Node.js backend, you create a new instance of `BatchedGraphQLClient` which has its
own cache and batching. Sharing a `BatchedGraphQLClient` instance across requests against your webserver is not recommended as that would result
in Memory Leaks with the Cache growing infinitely. The batching and caching is based on [`dataloader`](https://github.com/facebook/dataloader)

## Install

```sh
npm install batched-graphql-request
```

## Usage
The basic usage is exactly the same as you're used to with [`graphql-request`](https://github.com/graphcool/graphql-request)
```js
import { BatchedGraphQLClient } from 'batched-graphql-request'

const client = new BatchedGraphQLClient(endpoint, { headers: {} })
client.request(query, variables).then(data => console.log(data)) 
```

## Examples

### Creating a new Client per request
In this example, we proxy requests that come in the form of [batched array](https://blog.graph.cool/improving-performance-with-apollo-query-batching-66455ea9d8bc).
Instead of sending each request individually to `my-endpoint`, all requests are again batched together and send grouped to
the underlying endpoint, which increases the performance dramatically.
```js
import { BatchedGraphQLClient } from 'batched-graphql-request'
import * as express from 'express'
import * as bodyParser from 'body-parser'

const app = express()

/*
This accepts POST requests to /graphql of this form:
[
  {query: "...", variables: {}},
  {query: "...", variables: {}},
  {query: "...", variables: {}}
]
 */

app.use(
  '/graphql',
  bodyParser.json(),
  async (req, res) => {
    const client = new BatchedGraphQLClient('my-endpoint', {
      headers: {
        Authorization: 'Bearer my-jwt-token',
      },
    })
    
    const requests = Array.isArray(req.body) ? req.body : [req.body]
    
    const results = await Promise.all(requests.map(({query, variables}) => client.request(query, variables)))
    
    res.json(results)
  }
)

app.listen(3000, () =>
  console.log('Server running.'),
)
```

To learn more about the usage, please check out [graphql-request](https://github.com/graphcool/graphql-request)

## Help & Community [![Slack Status](https://slack.graph.cool/badge.svg)](https://slack.graph.cool)

Join our [Slack community](http://slack.graph.cool/) if you run into issues or have questions. We love talking to you!

![](http://i.imgur.com/5RHR6Ku.png)
