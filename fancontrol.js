// Homebridge plugin for Fantasia Viper fans
// Copyright © 2019 Alexander Thoukydides

'use strict';

let request = require('request');

// Button mappings
const BUTTON = {
    LOW:        0,
    LIGHT:      1,
    DIM:        2,
    MEDIUM:     3,
    HIGH:       4,
    OFF:        5,
    // There is no button 6
    REVERSE:    7 // (Viper Plus only)
};

// Transmitter timings in microseconds for a 4.4kHz oscillator
const TX_CLOCK  = 225;
const TX_SYNC   = [TX_CLOCK];
const TX_0      = [TX_CLOCK, 2 * TX_CLOCK];
const TX_1      = [2 * TX_CLOCK, TX_CLOCK];
const TX_PILOT  = [20 * TX_CLOCK]; // (12 should suffice for the pilot period)

// Number of times to repeat each transmission
const TX_REPEAT = 5; // (4 should suffice)

// Control a single fan
module.exports = class FanControl {
    
    // Constructor
    constructor(log, address, host, port) {
        this.log = log;
        this.address = address.map(b => b ? 1 : 0);
        this.host = host;
        this.port = port;
    }

    // Button presses
    buttonOff(callback)     { this.button(BUTTON.OFF,     callback); }
    buttonLow(callback)     { this.button(BUTTON.LOW,     callback); }
    buttonMedium(callback)  { this.button(BUTTON.MEDIUM,  callback); }
    buttonHigh(callback)    { this.button(BUTTON.HIGH,    callback); }
    buttonReverse(callback) { this.button(BUTTON.REVERSE, callback); }
    buttonLight(callback)   { this.button(BUTTON.LIGHT,   callback); }
    buttonDim(callback)     { this.button(BUTTON.DIM,     callback); }

    // An arbitrary button press
    button(pin, callback) {
        // Construct the (inverted) bit sequence for this button
        let word = Array(8).fill(0).concat(this.address);
        word[pin] = 1;
        this.log.debug('Transmit bits: ' + word.join('') + ' (inverted)');

        // Convert to a sequence of on/off timings for the transmitter
        let txWord   = [].concat(...word.map(b => b ? TX_0 : TX_1));
        let txSingle = [].concat(TX_SYNC, txWord, TX_PILOT);
        let txCode   = [].concat(...Array(TX_REPEAT).fill(txSingle)).join(' ');
        this.log.debug('Transmit timings: ' + txCode + ' (microseconds)');
        
        // Transmit the pattern
        this.pilightSend('send', { protocol: "raw", code: "'" + txCode + "'" },
                         callback);
    }

    // Send data to the pilight daemon
    pilightSend(cmd, args, callback) {
        let options = {
            url:    'http://' + this.host + ':' + this.port + '/' + cmd,
            qs:     args,
            json:   true
        };
        let logPrefix = 'pilight-' + cmd + ': ';
        this.log.debug(logPrefix + 'GET');
        let startTime = Date.now();
        request.get(options, (err, response, body) => {
            let msg = err || response.statusMessage;
            if (body && body.message) msg = body.message;
            let logMsg = msg + ' +' + (Date.now() - startTime) + 'ms ';

            // Check whether the request was successful
            if (err || (400 <= response.statusCode)
                || (body.message != 'success')) {
                this.log.error(logPrefix + 'ERROR ' + logMsg);
                callback(new Error('pilight error: ' + msg));
            } else {
                this.log.debug(logPrefix + logMsg);
                callback(null);
            }
        });
    }
}
