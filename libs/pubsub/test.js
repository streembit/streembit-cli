'use strict';

const constants = require("libs/constants");
const { events, logger } = require("streembit-util");
const PubSub = require("./");

const pubsub = new PubSub();

module.exports = function() {
    // Register dynamic account subscriber
    try {
        setTimeout(() => {
            logger.info('test_DYN_ACCOUNT subscriber registered');
            events.emit(constants.SUBSCRIBE_EVENT, 'test_DYN_ACCOUNT', function dyn_acc_sub() {
                console.log('I am dynamic ACCOUNT subscriber:', ...arguments);
            });
        }, 5000);
    } catch(err) {
        logger.error('Account subscriber error: %j', err);
    }

    // Register app init subscribers
    try {
        pubsub.sub(constants.PUBSUB_SEED, function upd_seed() {
            console.log('I am SEED subscriber: ', ...arguments);
        });
        pubsub.sub(constants.PUBSUB_ACCOUNT, function upd_txn() {
            console.log('I am ACCOUNT subscriber: ', ...arguments);
        });
    } catch (err) {
        logger.error('Subscriber failed: %j', err);
    }

    // Publish test_DYN_ACCOUNT
    try {
        setTimeout(() => {
            logger.info('PUBLISH test_DYN_ACCOUNT');
            events.emit(constants.PUBLISH_EVENT, { topic: 'test_DYN_ACCOUNT', payload: 'update account sent' })
        }, 45000);
    } catch (err) {
        logger.error('Publisher test_DYN_ACCOUNT failed: %j', err);
    }

    // Publish PUBSUB_SEED
    try {
        setTimeout(() => {
            logger.info('PUBLISH PUBSUB_SEED');
            events.emit(constants.PUBLISH_EVENT, { topic: constants.PUBSUB_SEED, payload: 'update account sent' })
        }, 60000);
    } catch (err) {
        logger.error('Publisher PUBSUB_SEED failed: %j', err);
    }
    // Publish PUBSUB_ACCOUNT
    try {
        setTimeout(() => {
            logger.info('PUBLISH PUBSUB_ACCOUNT');
            events.emit(constants.PUBLISH_EVENT, { topic: constants.PUBSUB_ACCOUNT, payload: 'update seed sent' })
        }, 65000);
    } catch (err) {
        logger.error('Publisher PUBSUB_SEED failed: %j', err);
    }

    /* Stress test */

    // Subscribe
    let stress = 0;
    try {
        pubsub.sub('STRESS_TEST', function upd_txn(counter) {
            console.log(`Stress me baby ${counter} times`);
        });
    } catch (err) {
        logger.error('Stress test subscriber failed: %j', err)
    }

    // Publish
    try {
        setTimeout(() => {
            const stressInt = setInterval(() => {
                (stress < 2000)
                    ? events.emit(constants.PUBLISH_EVENT, {topic: 'STRESS_TEST', payload: stress++})
                    : clearInterval(stressInt);
            }, 50)
        }, 85000);
    } catch (err) {
        logger.error('Stress test publisher failed: %j', err)
    }
};
