# homebridge-fantasia

Fantasia Viper fan plugin for [Homebridge](https://github.com/nfarina/homebridge).

Fantasia is a trademark owned by [Fantasia Distribution Ltd](https://www.fantasiaceilingfans.com).

This plugin was developed for a Fantasia Viper ceiling fan that uses a [TR32A 433.92MHz](https://www.fan-light.com/product.php?id=188) remote control. It may work with other fans that similarly use a [Holtek HT12E](https://www.holtek.com/documents/10179/116711/2_12ev120.pdf) encoder to drive an [R433A](http://www.msilverman.me/wp-content/uploads/2014/01/K1037299581.pdf) 433.92MHz SAW Resonator.

## Installation

1. Connect a 433.92MHz transmitter to the computer (see partlist and wiring guide below).
1. Install [pilight](https://www.pilight.org/) by following the instructions at: https://manual.pilight.org/installation.html
1. Configure pilight to match the wiring of the 433.92MHz transmitter (see example below).
1. Install this plugin using: `npm install -g homebridge-fantasia`
1. Edit `config.json` and add a Fantasia accessory for each fan to be controlled (see example below).
1. Run [Homebridge](https://github.com/nfarina/homebridge).

### Partlist

* [Raspberry Pi 2 Model B](https://www.amazon.co.uk/Raspberry-Pi-Model-Desktop-Linux/dp/B00T2U7R7I)
* [Raspberry Pi NOOBS Micro SD Card](https://www.amazon.co.uk/gp/product/B01D4TW25Y)
* [GorillaPi Raspberry Pi Case](https://www.amazon.co.uk/dp/B01D1QN4YI)
* [FS1000A 433.92MHz transmitter](https://www.amazon.co.uk/kwmobile-transmitter-receiver-wireless-Raspberry/dp/B01H2D2RH6)
* [Female-Female Jumper Breadboard Wire](https://www.amazon.co.uk/gp/product/B076CH54ZM)

Alternative small form factor computers (e.g. other Raspberry Pi models or Arduino) or 433.92MHz ASK/OOK transmitters may also be suitable.

### Wiring

Connect the FS1000A 433.92MHz transmitter to the Raspberry Pi 2 Model B GPIO header J8:

| FS1000A pin | Raspberry Pi pin |
| ------------ | ---------------- |
| GND          | Pin 6 (Ground)   |
| DATA         | Pin 12 (GPIO 1)  |
| VCC          | Pin 4 (5V Power) |

(Ignore the misleading *ATAD* silkscreen lettering on the FS1000A; the middle pin is *DATA*.)

Solder an antenna to the hole in the corner of the FS1000A board (not the small hole near the *ANT* silkscreen). This can be a simple straight piece of wire: 69.24cm (wavelength), 34.6cm (half wavelength), or 17.3cm (quarter wavelength). However, a [coil loaded antenna](https://www.instructables.com/id/433-MHz-Coil-loaded-antenna/) is likely to give better results.

### Example `/etc/pilight/config.json`
```JSON
{
    "devices": {},
    "rules": {},
    "gui": {},
    "settings": {
        "log-level": 6,
        "pid-file": "/var/run/pilight.pid",
        "log-file": "/var/log/pilight.log",
        "standalone": 0,
        "port": 5000,
        "webserver-enable": 1,
        "webserver-root": "/usr/local/share/pilight/webgui",
        "webserver-http-port": 5001,
        "webserver-https-port": 5002,
        "webserver-cache": 1,
        "whitelist": "",
        "gpio-platform": "raspberrypi2"
    },
    "hardware": {
        "433gpio": {
            "sender": 1,
            "receiver": -1
        }
    },
    "registry": {
        "webserver": {
            "ssl": {
                "certificate": {
                    "location": "/etc/pilight/pilight.pem"
                }
            }
        },
        "pilight": {
            "version": {
                "current": "8.1.4"
            }
        }
    }
}
```
The essential changes to the default configuration are:
* Change `gpio-platform` to `raspberrypi2` specifying the GPIO hardware platform being used.
* In the `hardware` section add `433gpio` configuration to specify the GPIO used to drive the FS1000A 433.92MHz transmitter. Note that pilight use the *Wiring Pi* GPIO numbering scheme (not the BCM GPIO or physical header pin numbering scheme).

### Example `config.json`
```JSON
{
    "accessories":
    [{
        "accessory":    "Fantasia",
        "name":         "Bedroom Fan",
        "address":      [0, 1, 0, 1],
        "host":         "localhost",
        "port":         5001
    }]
}
```
The `address` should be set to match the *code switch* within the remote control and receiver. Four values are required, corresponding to switch 1 through switch 4. Use `0` if the switch is towards the numbers *1234*, and `1` if it is towards the *ON DIP* text.

Multiple accessories can be added to control different fans. They must be each given a unique name and address.

The `host` and `port` specify how to reach the pilight daemon. They can be omitted if pilight is running on port 5000 on the same machine as this plugin.

## Notes

This plugin is transmit-only; it does not monitor the fan's original remote control, so the status within HomeKit may not match the fan's actual state.

The current version of this plugin only supports fan speed control. It does not support reversing the direction or control of the light.

## License

> ISC License (ISC)<br>Copyright © 2019 Alexander Thoukydides
>
> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
