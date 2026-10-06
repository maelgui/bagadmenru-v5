
# SeasonRanking

Full ranking for one window.  ``season`` is the starting year of the season (e.g. ``2024`` for the 2024-2025 season), or ``None`` for the all-time aggregate across seasons.

## Properties

Name | Type
------------ | -------------
`season` | number
`items` | [Array&lt;UserRankingItem&gt;](UserRankingItem.md)

## Example

```typescript
import type { SeasonRanking } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "season": null,
  "items": null,
} satisfies SeasonRanking

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as SeasonRanking
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


