/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Event } from '../models/Event';
import type { EventCreate } from '../models/EventCreate';
import type { Response } from '../models/Response';
import type { ResponseCreate } from '../models/ResponseCreate';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class EventsService {

    /**
     * List Events
     * @returns Event Successful Response
     * @throws ApiError
     */
    public static listEventsApiV1EventsGet(): CancelablePromise<Array<Event>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/events/',
        });
    }

    /**
     * Create Event
     * @param requestBody
     * @returns Event Successful Response
     * @throws ApiError
     */
    public static createEventApiV1EventsPost(
        requestBody: EventCreate,
    ): CancelablePromise<Event> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/events/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Event
     * @param eventId
     * @returns Event Successful Response
     * @throws ApiError
     */
    public static getEventApiV1EventsEventIdGet(
        eventId: string,
    ): CancelablePromise<Event> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/events/{event_id}',
            path: {
                'event_id': eventId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Event
     * @param eventId
     * @param requestBody
     * @returns Event Successful Response
     * @throws ApiError
     */
    public static updateEventApiV1EventsEventIdPut(
        eventId: string,
        requestBody: EventCreate,
    ): CancelablePromise<Event> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/events/{event_id}',
            path: {
                'event_id': eventId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Delete Event
     * @param eventId
     * @returns void
     * @throws ApiError
     */
    public static deleteEventApiV1EventsEventIdDelete(
        eventId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/events/{event_id}',
            path: {
                'event_id': eventId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Create Response
     * @param eventId
     * @param requestBody
     * @returns void
     * @throws ApiError
     */
    public static createResponseApiV1EventsEventIdResponsesPut(
        eventId: string,
        requestBody: ResponseCreate,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/events/{event_id}/responses',
            path: {
                'event_id': eventId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * List Responses
     * @returns Response Successful Response
     * @throws ApiError
     */
    public static listResponsesApiV1ResponsesGet(): CancelablePromise<Array<Response>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/responses/',
        });
    }

}
