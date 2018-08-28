/*
This file is part of Streembit application.
Streembit is an open source project to create a real time communication system for humans and machines.

Streembit is a free software: you can redistribute it and/or modify it under the terms of the GNU General Public License
as published by the Free Software Foundation, either version 3.0 of the License, or (at your option) any later version.

Streembit is distributed in the hope that it will be useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU General Public License for more details.

You should have received a copy of the GNU General Public License along with Streembit software.
If not, see http://www.gnu.org/licenses/.

-------------------------------------------------------------------------------------------------------------------------
Author: Streembit team
Copyright (C) 2018 The Streembit software development team

Based on kadence library https://github.com/kadence author Gordon Hall https://github.com/bookchin
-------------------------------------------------------------------------------------------------------------------------
*/

'use strict';

const constants = require("libs/constants");
const events = require("streembit-util").events;
const logger = require("streembit-util").logger;
const kad = require("libs/peernet/kad");

let instance = null;

class Pubsub {

    /*
     * Singleton with default subscription types initialization
     */
    constructor() {
        if (!instance) {
            this.kad = new kad.KadHandler();
            /* initial subscriptions maybe, somewhere in pubsub/txn_subs etc. */
            this.subscribeTo = [
                { topic: 'TXN', callbacks: [] },
                { topic: 'BLOCK', callbacks: [] },
                { topic: 'BLACKLIST', callbacks: [] },
                { topic: 'IOT', callbacks: [] }
            ];

            instance = this;
        }

        return instance;
    }

    /*
     * Subscribe on app init
     */
    sub(topic, callback) {
        const topicIdx = this.subscribeTo.findIndex(s => s.topic === topic);

        return ~topicIdx ?
            this.subscribeTo[topicIdx].callbacks.push(callback) :
            this.subscribeTo.push({
                topic,
                callbacks: [callback]
            });
    }

    pub({ topic, payload }) {
        return this.kad.publish(topic, payload);
    }

    init(callback) {
        try {
            for(var a = 0, sl = this.subscribeTo.length; a < sl; ++a) {
                if (this.subscribeTo[a].callbacks.length) {
                    this.kad.subscribe(this.subscribeTo[a].topic, payload => {
                        this.subscribeTo[a].callbacks.map(cb => cb(payload));
                    })
                }
            }

            events.on(
                'PUBLISH_EVENT',
                payload => {
                    try {
                        this.pub(payload);
                    }
                    catch (err) {
                        logger.error("PUBSUB_PUB_EVENT error %j", err)
                    }
                });

            /*
             * Subscribe dynamically
             */
            events.on(
                'SUBSCRIBE_EVENT',
                (subTopic, subCb) => {
                    try {
                        if (~this.subscribeTo.findIndex(s => s.topic === subTopic)) {
                            throw new Error('this topic name has already been taken by another subscriber');
                        }

                        if (typeof subCb !== 'function') {
                            throw new Error('subscription callback is not of callable type');
                        }

                        this.kad.subscribe(subTopic, subCb);
                    }
                    catch (err) {
                        logger.error("pubSub PUBSUB_SUB_EVENT error %j", err);
                    }
            });

            callback();
        } catch (err) {
            logger.error("Publish/Subscribe module error: %j", err);
        }
    }
}

module.exports = Pubsub;
