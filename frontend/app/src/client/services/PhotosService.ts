/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { Album } from '../models/Album';
import type { AlbumCreate } from '../models/AlbumCreate';
import type { Body_upload_file_api_v1_albums__album_id__photos_post } from '../models/Body_upload_file_api_v1_albums__album_id__photos_post';
import type { Photo } from '../models/Photo';

import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';

export class PhotosService {

    /**
     * List Albums
     * @returns Album Successful Response
     * @throws ApiError
     */
    public static listAlbumsApiV1AlbumsGet(): CancelablePromise<Array<Album>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/albums/',
        });
    }

    /**
     * Create Album
     * @param requestBody
     * @returns Album Successful Response
     * @throws ApiError
     */
    public static createAlbumApiV1AlbumsPost(
        requestBody: AlbumCreate,
    ): CancelablePromise<Album> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/albums/',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Get Album
     * @param albumId
     * @returns Album Successful Response
     * @throws ApiError
     */
    public static getAlbumApiV1AlbumsAlbumIdGet(
        albumId: string,
    ): CancelablePromise<Album> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/albums/{album_id}',
            path: {
                'album_id': albumId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Update Album
     * @param albumId
     * @param requestBody
     * @returns Album Successful Response
     * @throws ApiError
     */
    public static updateAlbumApiV1AlbumsAlbumIdPut(
        albumId: string,
        requestBody: AlbumCreate,
    ): CancelablePromise<Album> {
        return __request(OpenAPI, {
            method: 'PUT',
            url: '/api/v1/albums/{album_id}',
            path: {
                'album_id': albumId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Delete Album
     * @param albumId
     * @returns void
     * @throws ApiError
     */
    public static deleteAlbumApiV1AlbumsAlbumIdDelete(
        albumId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/albums/{album_id}',
            path: {
                'album_id': albumId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * List Album Photos
     * @param albumId
     * @returns Photo Successful Response
     * @throws ApiError
     */
    public static listAlbumPhotosApiV1AlbumsAlbumIdPhotosGet(
        albumId: string,
    ): CancelablePromise<Array<Photo>> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/v1/albums/{album_id}/photos',
            path: {
                'album_id': albumId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Upload File
     * @param albumId
     * @param formData
     * @returns Photo Successful Response
     * @throws ApiError
     */
    public static uploadFileApiV1AlbumsAlbumIdPhotosPost(
        albumId: string,
        formData: Body_upload_file_api_v1_albums__album_id__photos_post,
    ): CancelablePromise<Photo> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/v1/albums/{album_id}/photos',
            path: {
                'album_id': albumId,
            },
            formData: formData,
            mediaType: 'multipart/form-data',
            errors: {
                422: `Validation Error`,
            },
        });
    }

    /**
     * Delete Photo
     * @param albumId
     * @param photoId
     * @returns void
     * @throws ApiError
     */
    public static deletePhotoApiV1AlbumsAlbumIdPhotosPhotoIdDelete(
        albumId: string,
        photoId: string,
    ): CancelablePromise<void> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/v1/albums/{album_id}/photos/{photo_id}',
            path: {
                'album_id': albumId,
                'photo_id': photoId,
            },
            errors: {
                422: `Validation Error`,
            },
        });
    }

}
