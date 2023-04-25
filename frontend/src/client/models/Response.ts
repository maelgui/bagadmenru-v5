/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { Event } from './Event';
import type { Profile } from './Profile';

export type Response = {
    value: boolean;
    user: Profile;
    event: Event;
    date: string;
    id: number;
};

