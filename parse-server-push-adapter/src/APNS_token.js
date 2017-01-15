"use strict";

// TODO: apn does not support the new HTTP/2 protocal. It is fine to use it in V1,
// but probably we will replace it in the future.
import apn from 'apn';
import Parse from 'parse';
import log from 'npmlog';

const LOG_PREFIX = 'parse-server-push-adapter APNS';
/**
 * Create a new connection to the APN service.
 * @constructor
 * @param {Object|Array} args An argument or a list of arguments to config APNS connection
 * @param {String} args.cert The filename of the connection certificate to load from disk
 * @param {String} args.key The filename of the connection key to load from disk
 * @param {String} args.pfx The filename for private key, certificate and CA certs in PFX or PKCS12 format, it will overwrite cert and key
 * @param {String} args.passphrase The passphrase for the connection key, if required
 * @param {String} args.bundleId The bundleId for cert
 * @param {Boolean} args.production Specifies which environment to connect to: Production (if true) or Sandbox
 */


function APNS(args) {
  // Since for ios, there maybe multiple cert/key pairs,
  // typePushConfig can be an array.
  let apnsArgsList = [];
  if (Array.isArray(args)) {
    apnsArgsList = apnsArgsList.concat(args);
  } else if (typeof args === 'object') {
    apnsArgsList.push(args);
  } else {
    throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                          'APNS Configuration is invalid');
  }

  this.conns = [];
  for (let apnsArgs of apnsArgsList) {
    let conn = new apn.Connection(apnsArgs);
    if (!apnsArgs.bundleId) {
      throw new Parse.Error(Parse.Error.PUSH_MISCONFIGURED,
                            'BundleId is mssing for %j', apnsArgs);
    }
    conn.bundleId = apnsArgs.bundleId;
    // Set the priority of the conns, prod cert has higher priority
    if (apnsArgs.production) {
      conn.priority = 0;
    } else {
      conn.priority = 1;
    }

    // Set apns client callbacks
    conn.on('connected', () => {
      log.verbose(LOG_PREFIX, 'APNS Connection %d Connected', conn.index);
    });

    conn.on('transmissionError', (errCode, notification, apnDevice) => {
      handleTransmissionError(this.conns, errCode, notification, apnDevice);
    });

    conn.on('timeout', () => {
      log.verbose(LOG_PREFIX, 'APNS Connection %d Timeout', conn.index);
    });

    conn.on('disconnected', () => {
      log.verbose(LOG_PREFIX, 'APNS Connection %d Disconnected', conn.index);
    });

    conn.on('socketError', () => {
      log.verbose(LOG_PREFIX, 'APNS Connection %d Socket Error', conn.index);
    });

    conn.on('transmitted', function(notification, device) {
      if (device.callback) {
        device.callback({
          notification: notification,
          transmitted: true,
          device: {
            deviceType: 'ios',
            deviceToken: device.token.toString('hex')
          }
        });
      }
      log.verbose(LOG_PREFIX, 'APNS Connection %d Notification transmitted to %s', conn.index, device.token.toString('hex'));
    });

    this.conns.push(conn);
  }
  // Sort the conn based on priority ascending, high pri first
  this.conns.sort((s1, s2) => {
    return s1.priority - s2.priority;
  });
  // Set index of conns
  for (let index = 0; index < this.conns.length; index++) {
    this.conns[index].index = index;
  }
}