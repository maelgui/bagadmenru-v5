
# RankingInfo

A single user\'s metrics and dense ranks within one ranking window.  A window is either a single season or the all-time aggregate. Ranks are computed in SQL. ``response_rate`` and its rank are ``None`` in the all-time window, where a rate across seasons is not meaningful.

## Properties

Name | Type
------------ | -------------
`medianResponseTime` | string
`medianResponseTimeRank` | number
`responseRate` | number
`responseRateRank` | number
`nPositiveResponses` | number
`nPositiveResponsesRank` | number

## Example

```typescript
import type { RankingInfo } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "medianResponseTime": null,
  "medianResponseTimeRank": null,
  "responseRate": null,
  "responseRateRank": null,
  "nPositiveResponses": null,
  "nPositiveResponsesRank": null,
} satisfies RankingInfo

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as RankingInfo
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


