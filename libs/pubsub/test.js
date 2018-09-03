'use strict';

const constants = require('libs/constants');
const { events, logger } = require('streembit-util');
const PubSub = require('./');
const config = require('libs/config');

const pubsub = new PubSub();

module.exports = function() {
    // Register dynamic account subscriber
    try {
        setTimeout(() => {
            logger.info('test_DYN_ACCOUNT subscriber registered');
            events.emit(constants.SUBSCRIBE_EVENT, 'test_DYN_ACCOUNT', function dyn_acc_sub() {
                console.log(`(SEED ${config.transport.port}) dynamic ACCOUNT subscriber. publication received:`, ...arguments);
            });
        }, 5000);
    } catch(err) {
        logger.error('Account subscriber error: %j', err);
    }

    // Register app init subscribers
    try {
        pubsub.sub(constants.PUBSUB_SEED, function upd_seed() {
            console.log(`(SEED ${config.transport.port}) inline SEED subscriber. publication received: `, ...arguments);
        });
        pubsub.sub(constants.PUBSUB_ACCOUNT, function upd_txn() {
            console.log(`(SEED ${config.transport.port}) inline ACCOUNT subscriber. publication received: `, ...arguments);
        });
        // subscribe to stress test
        pubsub.sub('STRESS_TEST', function upd_txn(payload) {
            console.log(`(SEED ${config.transport.port}). Stress test: ${payload.seed}@${payload.counter}`);
        });
    } catch (err) {
        logger.error('Subscriber failed: %j', err);
    }

    // Publish test_DYN_ACCOUNT
    try {
        setTimeout(() => {
            logger.info('PUBLISH topic: test_DYN_ACCOUNT');
            events.emit(constants.PUBLISH_EVENT, { topic: 'test_DYN_ACCOUNT', payload: `from (SEED ${config.transport.port}) test_DYN_ACCOUNT` })
        }, 45000);
    } catch (err) {
        logger.error('Publisher test_DYN_ACCOUNT failed: %j', err);
    }

    // Publish PUBSUB_SEED
    try {
        setTimeout(() => {
            logger.info('PUBLISH PUBSUB_SEED');
            events.emit(constants.PUBLISH_EVENT, { topic: constants.PUBSUB_SEED, payload: `from (SEED ${config.transport.port}) ${constants.PUBSUB_SEED}` })
        }, 60000);
    } catch (err) {
        logger.error('Publisher PUBSUB_SEED failed: %j', err);
    }
    // Publish PUBSUB_ACCOUNT
    try {
        setTimeout(() => {
            logger.info('PUBLISH PUBSUB_ACCOUNT');
            events.emit(constants.PUBLISH_EVENT, { topic: constants.PUBSUB_ACCOUNT, payload: `from (SEED ${config.transport.port}) ${constants.PUBSUB_ACCOUNT}` })
        }, 65000);
    } catch (err) {
        logger.error('Publisher PUBSUB_SEED failed: %j', err);
    }

    /* Stress test */
    let stress = 0;
    // Publish
    try {
        setTimeout(() => {
            const stressInt = setInterval(() => {
                (stress < 2000)
                    ? events.emit(constants.PUBLISH_EVENT, { topic: 'STRESS_TEST', payload: { seed: config.transport.port, counter: ++stress }})
                    : clearInterval(stressInt);
            }, 50)
        }, 85000);
    } catch (err) {
        logger.error('Stress test publisher failed: %j', err)
    }
};
