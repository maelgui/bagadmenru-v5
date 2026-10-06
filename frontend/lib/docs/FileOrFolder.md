
# FileOrFolder


## Properties

Name | Type
------------ | -------------
`name` | string
`type` | [FileOrFolderType](FileOrFolderType.md)
`id` | number
`parentId` | number
`fileKey` | string
`childCount` | number
`fileUrl` | string
`downloadUrl` | string

## Example

```typescript
import type { FileOrFolder } from 'bagad-client'

// TODO: Update the object below with actual values
const example = {
  "name": null,
  "type": null,
  "id": null,
  "parentId": null,
  "fileKey": null,
  "childCount": null,
  "fileUrl": null,
  "downloadUrl": null,
} satisfies FileOrFolder

console.log(example)

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example)
console.log(exampleJSON)

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as FileOrFolder
console.log(exampleParsed)
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)


