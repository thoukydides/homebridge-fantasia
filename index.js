// Homebridge plugin for Fantasia Viper fans
// Copyright © 2019 Alexander Thoukydides

'use strict';

let FanControl = require('./fancontrol');

let UUID;
let Service, Characteristic;

// Platform identifiers
const PLUGIN_NAME = 'homebridge-fantasia';
const ACCESSORY_NAME = 'Fantasia';

// Accessory information
const INFO_MANUFACT     = 'Fantasia';
const INFO_MODEL        = 'Viper';
const INFO_FIRMWARE     = require('./package.json').version;

// Accessory defaults
const DEFAULT_NAME      = 'Fan';
const DEFAULT_ADDRESS   = [0, 0, 0, 0];
const DEFAULT_HOST      = 'localhost';
const DEFAULT_PORT      = 5001;

// Fan speeds (as used by Siri)
const SPEED = {
    OFF:      0,
    LOW:     25,
    MEDIUM:  50,
    HIGH:   100
};
const SPEED_MIN_STEP = 25;

// Delay between updating the fan
const UPDATE_DELAY = 100; // (milliseconds)

// Register as a provider of Fantasia fan accessories
module.exports = homebridge => {
    Service = homebridge.hap.Service;
    Characteristic = homebridge.hap.Characteristic;
    homebridge.registerAccessory(PLUGIN_NAME, ACCESSORY_NAME,
                                 FantasiaAccessory);
}

// A Fantasia fan accessory
class FantasiaAccessory {

    // Constructor
    constructor(log, config) {
        this.log = log;

        // Extract the configuration, applying defaults where missing
        this.name    = config.name    || DEFAULT_NAME;
        this.address = config.address || DEFAULT_ADDRESS;
        this.host    = config.host    || DEFAULT_HOST;
        this.port    = config.port    || DEFAULT_PORT;
        
        // Convert the address into a serial number
        this.sn = this.address.map(sw => sw ? 'ON' : 'off').join('-');
        this.log('New ' + ACCESSORY_NAME + " accessory '" + this.name + "'"
                 + ' (' + this.sn
                 + ' via ' + this.host + ':' + this.port + ')');

        // Create a fan controller
        this.fan = new FanControl(log, this.address, this.host, this.port);

        // Assume that the fan is off initially
        this.stateOn = false;
        this.stateSpeed = SPEED.OFF;

        // Pending fan state updates
        this.updateCallbacks = [];
        this.updateInProgress = false;
    }

    // Return a list of the accessory's services
    getServices () {
        // Create a temporary Information Service for this accessory
        let informationService = new Service.AccessoryInformation()
            .setCharacteristic(Characteristic.Manufacturer,     INFO_MANUFACT)
            .setCharacteristic(Characteristic.Model,            INFO_MODEL)
            .setCharacteristic(Characteristic.SerialNumber,     this.sn)
            .setCharacteristic(Characteristic.FirmwareRevision, INFO_FIRMWARE);

        // Create the Fan service for this accessory
        this.fanService = new Service.Fan(this.name);
        this.fanService
            .getCharacteristic(Characteristic.On)
            .on('set', (...args) => this.setFanOn(...args))
            .on('get', (callback) => callback(null, this.stateOn));
        // HERE - Could use this to support the Reverse button for Viper Plus
        //this.fanService
        //    .addCharacteristic(Characteristic.RotationDirection)
        //    .on('set', (...args) => this.setFanDirection(...args));
        this.fanService
            .addCharacteristic(Characteristic.RotationSpeed)
            .setProps({ minValue: SPEED.OFF, maxValue: SPEED.HIGH,
                        minStep: SPEED_MIN_STEP })
            .on('set', (...args) => this.setFanSpeed(...args))
            .on('get', (callback) => callback(null, this.stateSpeed));

        // Return all services (Homebridge replaces the AccessoryInformation)
        return [informationService, this.fanService];
    }

    // Identify this accessory
    identify(callback) {
        this.log('Identify');
        callback();
    }

    // On characteristic set
    setFanOn(value, callback) {
        this.log('On = ' + value);
        this.stateOn = value;

        // Set the fan to the requested state
        this.controlFan(callback);
    }

    // RotationSpeed characteristic set
    setFanSpeed(value, callback) {
        // Snap the requested speed to a supported value
        if (value <= SPEED.OFF) {
            this.stateSpeed = SPEED.OFF;
        } else if (value < (SPEED.LOW + SPEED.MEDIUM) / 2) {
            this.stateSpeed = SPEED.LOW;
        } else if (value < (SPEED.MEDIUM + SPEED.HIGH) / 2) {
            this.stateSpeed = SPEED.MEDIUM;
        } else {
            this.stateSpeed = SPEED.HIGH;
        }
        if (this.stateSpeed == value) {
            this.log('RotationSpeed = ' + this.stateSpeed);
        } else {
            this.log('RotationSpeed = ' + this.stateSpeed
                     + ' (snapped from ' + value + ')');
        }

        // Set the fan to the requested state
        this.controlFan(callback);
    }

    // Set the fan to the requested state, with delay between updates
    controlFan(callback) {
        this.updateCallbacks.push(callback);
        
        // Schedule setting the fan state if this is the first request
        if ((this.updateCallbacks.length == 1) && !this.updateInProgress) {
            this.controlFanSchedule();
        }
    }

    // Schedule setting the fan to the requested state
    controlFanSchedule() {
        this.updateInProgress = true;
        setTimeout(() => {
            // Any update requests after this point trigger another update
            let callbacks = this.updateCallbacks;
            this.updateCallbacks = [];
            this.controlFanDeferred((err) => {
                // Call callbacks and check if another update required
                callbacks.forEach(callback => callback(err));
                this.updateInProgress = false;
                if (this.updateCallbacks.length) this.controlFanSchedule();
            });
        }, UPDATE_DELAY);
    }

    // Transmit the code to set the fan state
    controlFanDeferred(callback) {
        switch (this.stateOn ? this.stateSpeed : SPEED.OFF) {
        case SPEED.LOW:
            this.log('Setting fan speed to Low');
            this.fan.buttonLow(callback);
            break;
        case SPEED.MEDIUM:
            this.log('Setting fan speed to Medium');
            this.fan.buttonMedium(callback);
            break;
        case SPEED.HIGH:
            this.log('Setting fan speed to High');
            this.fan.buttonHigh(callback);
            break;
        default:
            this.log('Switching fan Off');
            this.fan.buttonOff(callback);
            break;
        }
    }
}
