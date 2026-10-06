# bagad-client@0.1.0

A TypeScript SDK client for the localhost API.

## Usage

First, install the SDK from npm.

```bash
npm install bagad-client --save
```

Next, try it out.


```ts
import {
  Configuration,
  AuthenticationApi,
} from 'bagad-client';
import type { DeletePasskeyApiV1WebauthnCredentialIdDeleteRequest } from 'bagad-client';

async function example() {
  console.log("🚀 Testing bagad-client SDK...");
  const config = new Configuration({ 
    // Configure HTTP bearer authorization: HTTPBearer
    accessToken: "YOUR BEARER TOKEN",
  });
  const api = new AuthenticationApi(config);

  const body = {
    // string
    credentialId: credentialId_example,
  } satisfies DeletePasskeyApiV1WebauthnCredentialIdDeleteRequest;

  try {
    const data = await api.deletePasskeyApiV1WebauthnCredentialIdDelete(body);
    console.log(data);
  } catch (error) {
    console.error(error);
  }
}

// Run the test
example().catch(console.error);
```


## Documentation

### API Endpoints

All URIs are relative to *http://localhost*

| Class | Method | HTTP request | Description
| ----- | ------ | ------------ | -------------
*AuthenticationApi* | [**deletePasskeyApiV1WebauthnCredentialIdDelete**](docs/AuthenticationApi.md#deletepasskeyapiv1webauthncredentialiddelete) | **DELETE** /api/v1/webauthn/{credential_id} | Delete Passkey
*AuthenticationApi* | [**listPasskeysApiV1WebauthnGet**](docs/AuthenticationApi.md#listpasskeysapiv1webauthnget) | **GET** /api/v1/webauthn/ | List Passkeys
*AuthenticationApi* | [**listSessionsApiV1AuthSessionsGet**](docs/AuthenticationApi.md#listsessionsapiv1authsessionsget) | **GET** /api/v1/auth/sessions | List Sessions
*AuthenticationApi* | [**loginWithCodeApiV1AuthLoginCodePost**](docs/AuthenticationApi.md#loginwithcodeapiv1authlogincodepost) | **POST** /api/v1/auth/login_code | Login With Code
*AuthenticationApi* | [**logoutApiV1AuthLogoutPost**](docs/AuthenticationApi.md#logoutapiv1authlogoutpost) | **POST** /api/v1/auth/logout | Logout
*AuthenticationApi* | [**prepareLoginApiV1AuthLoginGet**](docs/AuthenticationApi.md#prepareloginapiv1authloginget) | **GET** /api/v1/auth/login | Prepare Login
*AuthenticationApi* | [**preregisterPasskeyApiV1WebauthnPreregisterGet**](docs/AuthenticationApi.md#preregisterpasskeyapiv1webauthnpreregisterget) | **GET** /api/v1/webauthn/preregister | Preregister Passkey
*AuthenticationApi* | [**processLoginApiV1AuthLoginPost**](docs/AuthenticationApi.md#processloginapiv1authloginpost) | **POST** /api/v1/auth/login | Process Login
*AuthenticationApi* | [**registerPasskeyApiV1WebauthnRegisterPost**](docs/AuthenticationApi.md#registerpasskeyapiv1webauthnregisterpost) | **POST** /api/v1/webauthn/register | Register Passkey
*AuthenticationApi* | [**resetPasswordRequestApiV1AuthResetPasswordRequestPost**](docs/AuthenticationApi.md#resetpasswordrequestapiv1authresetpasswordrequestpost) | **POST** /api/v1/auth/reset_password_request | Reset Password Request
*AuthenticationApi* | [**setPasswordApiV1AuthSetPasswordPost**](docs/AuthenticationApi.md#setpasswordapiv1authsetpasswordpost) | **POST** /api/v1/auth/set_password | Set Password
*AuthenticationApi* | [**verifyEmailAccessApiV1AuthVerifyGet**](docs/AuthenticationApi.md#verifyemailaccessapiv1authverifyget) | **GET** /api/v1/auth/verify | Verify Email Access
*DefaultApi* | [**healthApiV1HealthGet**](docs/DefaultApi.md#healthapiv1healthget) | **GET** /api/v1/health | Health
*DefaultApi* | [**helloGet**](docs/DefaultApi.md#helloget) | **GET** / | Hello
*DefaultApi* | [**versionApiV1VersionGet**](docs/DefaultApi.md#versionapiv1versionget) | **GET** /api/v1/version | Version
*EventsApi* | [**createEventApiV1EventsPost**](docs/EventsApi.md#createeventapiv1eventspost) | **POST** /api/v1/events/ | Create Event
*EventsApi* | [**createResponseApiV1EventsEventIdResponsesPut**](docs/EventsApi.md#createresponseapiv1eventseventidresponsesput) | **PUT** /api/v1/events/{event_id}/responses | Create Response
*EventsApi* | [**createResponseByTokenApiV1ResponsesLinkSavePut**](docs/EventsApi.md#createresponsebytokenapiv1responseslinksaveput) | **PUT** /api/v1/responses/link/save | Create Response By Token
*EventsApi* | [**deleteEventApiV1EventsEventIdDelete**](docs/EventsApi.md#deleteeventapiv1eventseventiddelete) | **DELETE** /api/v1/events/{event_id} | Delete Event
*EventsApi* | [**exportIcsApiV1EventsExportIcsGet**](docs/EventsApi.md#exporticsapiv1eventsexporticsget) | **GET** /api/v1/events/export/ics | Export Ics
*EventsApi* | [**exportIcsMeApiV1EventsExportIcsMeGet**](docs/EventsApi.md#exporticsmeapiv1eventsexporticsmeget) | **GET** /api/v1/events/export/ics/me | Export Ics Me
*EventsApi* | [**getEventApiV1EventsEventIdGet**](docs/EventsApi.md#geteventapiv1eventseventidget) | **GET** /api/v1/events/{event_id} | Get Event
*EventsApi* | [**getResponseByTokenApiV1ResponsesLinkPrepareGet**](docs/EventsApi.md#getresponsebytokenapiv1responseslinkprepareget) | **GET** /api/v1/responses/link/prepare | Get Response By Token
*EventsApi* | [**listEventsApiV1EventsGet**](docs/EventsApi.md#listeventsapiv1eventsget) | **GET** /api/v1/events/ | List Events
*EventsApi* | [**listResponseChangesApiV1ResponsesChangesGet**](docs/EventsApi.md#listresponsechangesapiv1responseschangesget) | **GET** /api/v1/responses/changes | List Response Changes
*EventsApi* | [**listResponsesApiV1ResponsesGet**](docs/EventsApi.md#listresponsesapiv1responsesget) | **GET** /api/v1/responses/ | List Responses
*EventsApi* | [**updateEventApiV1EventsEventIdPut**](docs/EventsApi.md#updateeventapiv1eventseventidput) | **PUT** /api/v1/events/{event_id} | Update Event
*FilesApi* | [**createFolderApiV1FilesFolderIdPost**](docs/FilesApi.md#createfolderapiv1filesfolderidpost) | **POST** /api/v1/files/{folder_id} | Create Folder
*FilesApi* | [**deleteFileApiV1FilesFileIdDelete**](docs/FilesApi.md#deletefileapiv1filesfileiddelete) | **DELETE** /api/v1/files/{file_id} | Delete File
*FilesApi* | [**getBreadcrumbApiV1FilesFileIdBreadcrumbGet**](docs/FilesApi.md#getbreadcrumbapiv1filesfileidbreadcrumbget) | **GET** /api/v1/files/{file_id}/breadcrumb | Get Breadcrumb
*FilesApi* | [**getFileApiV1FilesFileIdGet**](docs/FilesApi.md#getfileapiv1filesfileidget) | **GET** /api/v1/files/{file_id} | Get File
*FilesApi* | [**getRootApiV1FilesRootGet**](docs/FilesApi.md#getrootapiv1filesrootget) | **GET** /api/v1/files/root | Get Root
*FilesApi* | [**listChildrenApiV1FilesFolderIdChildrenGet**](docs/FilesApi.md#listchildrenapiv1filesfolderidchildrenget) | **GET** /api/v1/files/{folder_id}/children | List Children
*FilesApi* | [**listFilesApiV1FilesGet**](docs/FilesApi.md#listfilesapiv1filesget) | **GET** /api/v1/files/ | List Files
*FilesApi* | [**updateFileApiV1FilesFileIdPut**](docs/FilesApi.md#updatefileapiv1filesfileidput) | **PUT** /api/v1/files/{file_id} | Update File
*FilesApi* | [**uploadFileApiV1FilesFolderIdUploadPost**](docs/FilesApi.md#uploadfileapiv1filesfolderiduploadpost) | **POST** /api/v1/files/{folder_id}/upload | Upload File
*HelloAssoApi* | [**deleteMembershipApiV1HelloassoOrdersMembershipIdDelete**](docs/HelloAssoApi.md#deletemembershipapiv1helloassoordersmembershipiddelete) | **DELETE** /api/v1/helloasso/orders/{membership_id} | Delete Membership
*HelloAssoApi* | [**helloassoWebhookApiV1HelloassoWebhookPost**](docs/HelloAssoApi.md#helloassowebhookapiv1helloassowebhookpost) | **POST** /api/v1/helloasso/webhook | Helloasso Webhook
*HelloAssoApi* | [**linkMembershipApiV1HelloassoOrdersMembershipIdLinkPost**](docs/HelloAssoApi.md#linkmembershipapiv1helloassoordersmembershipidlinkpost) | **POST** /api/v1/helloasso/orders/{membership_id}/link | Link Membership
*HelloAssoApi* | [**listUnlinkedMembershipsApiV1HelloassoOrdersUnlinkedGet**](docs/HelloAssoApi.md#listunlinkedmembershipsapiv1helloassoordersunlinkedget) | **GET** /api/v1/helloasso/orders/unlinked | List Unlinked Memberships
*InstrumentsApi* | [**listInstrumentsApiV1InstrumentsGet**](docs/InstrumentsApi.md#listinstrumentsapiv1instrumentsget) | **GET** /api/v1/instruments | List Instruments
*InvitationsApi* | [**acceptInvitationApiV1InvitationsTokenAcceptPost**](docs/InvitationsApi.md#acceptinvitationapiv1invitationstokenacceptpost) | **POST** /api/v1/invitations/{token}/accept | Accept Invitation
*InvitationsApi* | [**createInvitationApiV1InvitationsPost**](docs/InvitationsApi.md#createinvitationapiv1invitationspost) | **POST** /api/v1/invitations | Create Invitation
*InvitationsApi* | [**getInvitationApiV1InvitationsTokenGet**](docs/InvitationsApi.md#getinvitationapiv1invitationstokenget) | **GET** /api/v1/invitations/{token} | Get Invitation
*InvitationsApi* | [**requestOtpApiV1InvitationsTokenOtpPost**](docs/InvitationsApi.md#requestotpapiv1invitationstokenotppost) | **POST** /api/v1/invitations/{token}/otp | Request Otp
*ProfilesApi* | [**createGroupApiV1GroupsPost**](docs/ProfilesApi.md#creategroupapiv1groupspost) | **POST** /api/v1/groups/ | Create Group
*ProfilesApi* | [**createMyApiKeyApiV1ProfilesMeApiKeysPost**](docs/ProfilesApi.md#createmyapikeyapiv1profilesmeapikeyspost) | **POST** /api/v1/profiles/me/api-keys | Create My Api Key
*ProfilesApi* | [**createProfileApiV1ProfilesPost**](docs/ProfilesApi.md#createprofileapiv1profilespost) | **POST** /api/v1/profiles/ | Create Profile
*ProfilesApi* | [**deleteProfileApiV1ProfilesProfileIdDelete**](docs/ProfilesApi.md#deleteprofileapiv1profilesprofileiddelete) | **DELETE** /api/v1/profiles/{profile_id} | Delete Profile
*ProfilesApi* | [**getGlobalStatsApiV1StatsGet**](docs/ProfilesApi.md#getglobalstatsapiv1statsget) | **GET** /api/v1/stats/ | Get Global Stats
*ProfilesApi* | [**getGroupApiV1GroupsGroupIdGet**](docs/ProfilesApi.md#getgroupapiv1groupsgroupidget) | **GET** /api/v1/groups/{group_id} | Get Group
*ProfilesApi* | [**getMyMembershipApiV1ProfilesMeMembershipGet**](docs/ProfilesApi.md#getmymembershipapiv1profilesmemembershipget) | **GET** /api/v1/profiles/me/membership | Get My Membership
*ProfilesApi* | [**getMyPermissionsApiV1ProfilesMePermissionsGet**](docs/ProfilesApi.md#getmypermissionsapiv1profilesmepermissionsget) | **GET** /api/v1/profiles/me/permissions | Get My Permissions
*ProfilesApi* | [**getMyProfileApiV1ProfilesMeGet**](docs/ProfilesApi.md#getmyprofileapiv1profilesmeget) | **GET** /api/v1/profiles/me | Get My Profile
*ProfilesApi* | [**getMyRolesApiV1ProfilesMeRolesGet**](docs/ProfilesApi.md#getmyrolesapiv1profilesmerolesget) | **GET** /api/v1/profiles/me/roles | Get My Roles
*ProfilesApi* | [**getMyStatsApiV1StatsMeGet**](docs/ProfilesApi.md#getmystatsapiv1statsmeget) | **GET** /api/v1/stats/me | Get My Stats
*ProfilesApi* | [**getProfileApiV1ProfilesProfileIdGet**](docs/ProfilesApi.md#getprofileapiv1profilesprofileidget) | **GET** /api/v1/profiles/{profile_id} | Get Profile
*ProfilesApi* | [**getProfileMembershipApiV1ProfilesProfileIdMembershipGet**](docs/ProfilesApi.md#getprofilemembershipapiv1profilesprofileidmembershipget) | **GET** /api/v1/profiles/{profile_id}/membership | Get Profile Membership
*ProfilesApi* | [**getUserRankingsApiV1StatsRankingsGet**](docs/ProfilesApi.md#getuserrankingsapiv1statsrankingsget) | **GET** /api/v1/stats/rankings | Get User Rankings
*ProfilesApi* | [**listGroupsApiV1GroupsGet**](docs/ProfilesApi.md#listgroupsapiv1groupsget) | **GET** /api/v1/groups/ | List Groups
*ProfilesApi* | [**listMyApiKeysApiV1ProfilesMeApiKeysGet**](docs/ProfilesApi.md#listmyapikeysapiv1profilesmeapikeysget) | **GET** /api/v1/profiles/me/api-keys | List My Api Keys
*ProfilesApi* | [**listProfilesApiV1ProfilesGet**](docs/ProfilesApi.md#listprofilesapiv1profilesget) | **GET** /api/v1/profiles/ | List Profiles
*ProfilesApi* | [**listRolesApiV1RolesGet**](docs/ProfilesApi.md#listrolesapiv1rolesget) | **GET** /api/v1/roles/ | List Roles
*ProfilesApi* | [**revokeMyApiKeyApiV1ProfilesMeApiKeysKeyHashDelete**](docs/ProfilesApi.md#revokemyapikeyapiv1profilesmeapikeyskeyhashdelete) | **DELETE** /api/v1/profiles/me/api-keys/{key_hash} | Revoke My Api Key
*ProfilesApi* | [**unsubscribeApiV1ProfilesProfileIdUnsubscribePost**](docs/ProfilesApi.md#unsubscribeapiv1profilesprofileidunsubscribepost) | **POST** /api/v1/profiles/{profile_id}/unsubscribe | Unsubscribe
*ProfilesApi* | [**updateGroupApiV1GroupsGroupIdPut**](docs/ProfilesApi.md#updategroupapiv1groupsgroupidput) | **PUT** /api/v1/groups/{group_id} | Update Group
*ProfilesApi* | [**updateMyProfileApiV1ProfilesMePut**](docs/ProfilesApi.md#updatemyprofileapiv1profilesmeput) | **PUT** /api/v1/profiles/me | Update My Profile
*ProfilesApi* | [**updateProfileApiV1ProfilesProfileIdPut**](docs/ProfilesApi.md#updateprofileapiv1profilesprofileidput) | **PUT** /api/v1/profiles/{profile_id} | Update Profile
*ProfilesApi* | [**uploadAvatarApiV1ProfilesMeAvatarPost**](docs/ProfilesApi.md#uploadavatarapiv1profilesmeavatarpost) | **POST** /api/v1/profiles/me/avatar | Upload Avatar
*PushNotificationsApi* | [**deleteSubscriptionApiV1PushSubscriptionsSubscriptionIdDelete**](docs/PushNotificationsApi.md#deletesubscriptionapiv1pushsubscriptionssubscriptioniddelete) | **DELETE** /api/v1/push/subscriptions/{subscription_id} | Delete Subscription
*PushNotificationsApi* | [**getVapidPublicKeyApiV1PushVapidPublicKeyGet**](docs/PushNotificationsApi.md#getvapidpublickeyapiv1pushvapidpublickeyget) | **GET** /api/v1/push/vapid-public-key | Get Vapid Public Key
*PushNotificationsApi* | [**listSubscriptionsApiV1PushSubscriptionsGet**](docs/PushNotificationsApi.md#listsubscriptionsapiv1pushsubscriptionsget) | **GET** /api/v1/push/subscriptions | List Subscriptions
*PushNotificationsApi* | [**subscribeApiV1PushSubscribePost**](docs/PushNotificationsApi.md#subscribeapiv1pushsubscribepost) | **POST** /api/v1/push/subscribe | Subscribe
*PushNotificationsApi* | [**testPushApiV1PushTestPost**](docs/PushNotificationsApi.md#testpushapiv1pushtestpost) | **POST** /api/v1/push/test | Test Push
*PushNotificationsApi* | [**unsubscribeApiV1PushUnsubscribeDelete**](docs/PushNotificationsApi.md#unsubscribeapiv1pushunsubscribedelete) | **DELETE** /api/v1/push/unsubscribe | Unsubscribe
*UtilsApi* | [**getEmailsApiV1UtilsEmailsGet**](docs/UtilsApi.md#getemailsapiv1utilsemailsget) | **GET** /api/v1/utils/emails | Get Emails


### Models

- [ApiKey](docs/ApiKey.md)
- [ApiKeyCreate](docs/ApiKeyCreate.md)
- [ApiKeyCreated](docs/ApiKeyCreated.md)
- [Costume](docs/Costume.md)
- [CredentialDeviceType](docs/CredentialDeviceType.md)
- [Event](docs/Event.md)
- [EventCreate](docs/EventCreate.md)
- [FileOrFolder](docs/FileOrFolder.md)
- [FileOrFolderType](docs/FileOrFolderType.md)
- [FileOrFolderUpdate](docs/FileOrFolderUpdate.md)
- [FolderCreate](docs/FolderCreate.md)
- [GetUploadUrlResponse](docs/GetUploadUrlResponse.md)
- [GlobalStats](docs/GlobalStats.md)
- [Group](docs/Group.md)
- [GroupCreate](docs/GroupCreate.md)
- [GroupUpdate](docs/GroupUpdate.md)
- [HTTPValidationError](docs/HTTPValidationError.md)
- [HealthResponse](docs/HealthResponse.md)
- [InboxEmail](docs/InboxEmail.md)
- [InvitationAccept](docs/InvitationAccept.md)
- [InvitationChannel](docs/InvitationChannel.md)
- [InvitationCreate](docs/InvitationCreate.md)
- [InvitationCreated](docs/InvitationCreated.md)
- [InvitationInfo](docs/InvitationInfo.md)
- [LocationInner](docs/LocationInner.md)
- [LoginCode](docs/LoginCode.md)
- [LoginData](docs/LoginData.md)
- [LoginType](docs/LoginType.md)
- [LogoutRequest](docs/LogoutRequest.md)
- [MembershipHistoryItem](docs/MembershipHistoryItem.md)
- [MembershipInfo](docs/MembershipInfo.md)
- [MembershipLinkRequest](docs/MembershipLinkRequest.md)
- [MembershipStatus](docs/MembershipStatus.md)
- [MinimalGroup](docs/MinimalGroup.md)
- [MyProfileUpdate](docs/MyProfileUpdate.md)
- [MyStats](docs/MyStats.md)
- [OtpRequest](docs/OtpRequest.md)
- [Passkey](docs/Passkey.md)
- [PasskeySignal](docs/PasskeySignal.md)
- [Profile](docs/Profile.md)
- [ProfileCreate](docs/ProfileCreate.md)
- [ProfileUpdate](docs/ProfileUpdate.md)
- [PublicInstrument](docs/PublicInstrument.md)
- [PushDevice](docs/PushDevice.md)
- [PushSubscriptionCreate](docs/PushSubscriptionCreate.md)
- [PushSubscriptionResponse](docs/PushSubscriptionResponse.md)
- [RankingInfo](docs/RankingInfo.md)
- [RecoveryGrant](docs/RecoveryGrant.md)
- [Res](docs/Res.md)
- [ResetPasswordRequest](docs/ResetPasswordRequest.md)
- [Response](docs/Response.md)
- [ResponseChange](docs/ResponseChange.md)
- [ResponseChangeUser](docs/ResponseChangeUser.md)
- [ResponseCreate](docs/ResponseCreate.md)
- [Role](docs/Role.md)
- [SeasonRanking](docs/SeasonRanking.md)
- [SessionInfo](docs/SessionInfo.md)
- [SetPassword](docs/SetPassword.md)
- [Token](docs/Token.md)
- [UnlinkedMembership](docs/UnlinkedMembership.md)
- [UserRankingItem](docs/UserRankingItem.md)
- [UserRankings](docs/UserRankings.md)
- [ValidationError](docs/ValidationError.md)
- [VapidPublicKeyResponse](docs/VapidPublicKeyResponse.md)
- [VersionResponse](docs/VersionResponse.md)

### Authorization


Authentication schemes defined for the API:
<a id="HTTPBearer"></a>
#### HTTPBearer


- **Type**: HTTP Bearer Token authentication

## About

This TypeScript SDK client supports the [Fetch API](https://fetch.spec.whatwg.org/)
and is automatically generated by the
[OpenAPI Generator](https://openapi-generator.tech) project:

- API version: `0.1.0`
- Package version: `0.1.0`
- Generator version: `7.25.0`
- Build package: `org.openapitools.codegen.languages.TypeScriptFetchClientCodegen`

The generated npm module supports the following:

- Environments
  * Node.js
  * Webpack
  * Browserify
- Language levels
  * ES5 - you must have a Promises/A+ library installed
  * ES6
- Module systems
  * CommonJS
  * ES6 module system


## Development

### Building

To build the TypeScript source code, you need to have Node.js and npm installed.
After cloning the repository, navigate to the project directory and run:

```bash
npm install
npm run build
```

### Publishing

Once you've built the package, you can publish it to npm:

```bash
npm publish
```

## License

[]()
