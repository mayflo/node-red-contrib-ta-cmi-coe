# node-red-contrib-ta-cmi-coe

[🇩🇪 README Deutsche Version](README.de.md)

[![Platform][platform-shield]][platform-link] [![Release][release-shield]][release-link] [![Downloads][downloads-shield]][downloads-link] [![CommitDate][date-shield]][date-link] [![License][license-shield]][license-link] [![Languages][languages-shield]][languages-link]

Node-RED library for reading and writing values ​​to Technische Alternative CMI via CAN over Ethernet (CoE).

## Functionality

- **CoE Input Node**: Receives individual analog and digital values ​​from the CMI
- **CoE Output Node**: Sends individual values ​​to the CMI/controller
- **CoE Monitor**: Receives and monitors packets from all sources
- Support for CoE versions 1 & 2
- Automatic conversion of analog values ​​based on Unit ID
- Support for TA-defined measurement parameters
- Configuration of CMI and CoE version

---

[![BuyMeCoffee][buymecoffee-shield]][buymecoffee-link]

---

## Installation

### Via Node-RED Palette Manager (recommended)

1. Open Node-RED
2. Menu → Manage palette → Install
3. Search for `node-red-contrib-ta-cmi-coe`
4. Install the package

### Manual Installation

```bash
cd ~/.node-red
npm install node-red-contrib-ta-cmi-coe
```

### Local Development Environment

```bash
cd ~/.node-red
git clone https://github.com/mayflo/node-red-contrib-ta-cmi-coe.git
cd node-red-contrib-ta-cmi-coe
npm link
cd ~/.node-red
npm link node-red-contrib-ta-cmi-coe
```

Restart Node-RED.

## Prerequisites

- CMI from Technische Alternative with firmware 1.39.1 or higher
- The CoE version used is configured on the CMI (Settings > CAN > CoE).
- For receive: CoE outputs must be configured on the CMI (Settings > Outputs > CoE).
- For transmit: CAN inputs must be configured on the controller.
- To receive messages, the CMIs used require a fixed IP address.
- Communication takes place via UDP ports, which must be opened on the Node-RED host (CoE V1 Port 5441 / CoE V2 Port 5442).

## Supported Devices

The library was developed and tested for the UVR610, but it works with all devices connected via the CMI's CAN bus:
- UVR16x2
- UVR1611
- UVR61-3
- X2 Controller
- Other CAN bus devices from Technische Alternative

## Quick Start

### 1. Create a CMI Configuration Node

First, create a CMI configuration:
- Open any node for editing
- Click the plus sign next to "CMI Config" → "Add new node..."
- **IP Range**: IP address range of the UDP port (0.0.0.0 = all interfaces, 127.0.0.1 (local network)
- **CMI Address**: (Fixed) IP address of the CMI
- **CoE Version**: CoE V1/V2 (see CMI Settings → CAN)

### 2. Configure the CMI

#### For receiving from the CMI (CoE Input):
On the CMI under **Settings → Outputs → CoE**:
- **Input**: CAN bus input (e.g., CAN1)
- **IP**: IP address of Node-RED
- **Node**: Value from the "Node Number" of the input node
- **Network Output**: Number of the output (1-32)
- **Transmit Condition**: As required

#### For sending to the CMI (CoE Output):
On the controller: Configure the CAN input
- **Node**: Value from the "Node Number" of the output node
- **Output Number**: Number of the output (1-32)
- **Measured Unit**: "Automatic" for Node-RED Unit

## Node Types

### CoE Input Node

Receives values ​​from the CMI.

**Output Message:**
```javascript
{
    payload: 22.5,                    // The value
    topic: "coe/10/analog/1",         // Format: coe/{node}/{type}/{output}
    coe: {
        nodeNumber: 10,               // CAN Node Number
        blockNumber: 1,               // CoE Block Number
        outputNumber: 1,              // Network Output
        dataType: "analog",           // Type
        unit: 1,                      // Unit ID (z.B. 1 = °C)
        unitName: "Temperature °C",   // Unit name
        unitSymbol: "°C°",            // Unit symbol
        sourceIP: "192.168.1.100",    // IP of the CMI
        raw: { ... }                  // Raw datta
    }
}
```

### CoE Output Node

Sends individual values ​​to the CMI.

**Input Message:**
```javascript
// Simple:
msg.payload = 22.5;

// With own unit:
msg.payload = 22.5;
msg.coe = { unit: 1 };  // Overrides config
```

## Troubleshooting

### Not receiving any data

1. **Check CMI CoE outputs**: Check if IP address and port are correct
2. **Local IP**: Try the maximum receive range with Local IP = 0.0.0.0 (all) (especially for Docker environments)
3. **Firewall**: Check if ports 5441/UDP (CoE V1) or 5442/UDP (CoE V2) are open in the firewall
4. **Node Number**: Check if it matches the CMI configuration
5. **Enable Debug**: Activate "Receive All" and check the debug output

### Sending not working

1. **Is the CMI reachable?** Ping the CMI IP address
2. **CAN input on controller**: Check if node number and output number are correct
3. **Timeout on controller?** Use the "Send all outputs" interval

### Multiple CMIs

- Different node numbers must be used.

### Incorrect values

- **Values ​​too large**: CAN bus V1 is limited to ±32,767 (dimensionless)
- **Incorrect unit**: Some units (working number, Euro) have limitations
- **Decimal places**: Check if the correct unit ID is being used

## Known limitations

1. **Max. value range**: CAN bus version 1 is limited to ±32,767 (V2 for a larger value range)
2. **No acknowledgment**: CoE does not provide confirmation (fire-and-forget)
3. **The CMI functions as a gateway**: Values ​​are transmitted from the CMI via CoE, but cannot be sent directly to the CMI. The values ​​are forwarded from the CMI to the CAN bus and read by the controllers.

## Extended Usage

### Custom Unit Conversion

```javascript
// In Function Node before output:
const rawValue = msg.payload * 100;  // 2 decimal places
msg.payload = rawValue;
msg.coe = { unit: 0 };  // dimensionless
return msg;
```

## License

Published under the Apache 2.0 License

- ✅ Private and commercial use
- ⚠️ No liability for damages resulting from use

## Credits

Based on the protocol understanding and documentation of:
- [SymconJoTTACoE](https://github.com/jotata/SymconJoTTACoE/) by jotata
- [Ta-CoE](https://gitlab.com/DeerMaximum/ta-coe) by DeerMaximum

## Support

- **Issues**: [GitHub Issue Tracker](https://github.com/mayflo/node-red-contrib-ta-cmi-coe/issues)
- **Dokumentation**: view README

## Author

[![Author][author-shield]][author-link]

---

**Note**: This library was developed in my free time. Support is provided as it becomes available. 😊

[platform-link]: https://nodered.org
[platform-shield]: https://img.shields.io/badge/platform-Node--RED-red?style=flat
[release-link]: https://www.npmjs.com/package/node-red-contrib-ta-cmi-coe
[release-shield]: https://img.shields.io/npm/v/node-red-contrib-ta-cmi-coe?style=flat
[date-link]: https://github.com/mayflo/node-red-contrib-ta-cmi-coe/releases
[date-shield]: https://img.shields.io/github/release-date/mayflo/node-red-contrib-ta-cmi-coe?style=flat
[downloads-link]: https://www.npmjs.com/package/node-red-contrib-ta-cmi-coe
[downloads-shield]: https://img.shields.io/npm/d18m/node-red-contrib-ta-cmi-coe?style=flat
[license-link]: https://github.com/mayflo/node-red-contrib-ta-cmi-coe/blob/main/LICENSE
[license-shield]: https://img.shields.io/badge/license-Apache%202.0-blue?style=flat?style=flat
[languages-link]: https://github.com/mayflo/node-red-contrib-ta-cmi-coe
[languages-shield]: https://img.shields.io/github/languages/count/mayflo/node-red-contrib-ta-cmi-coe?style=flat
[author-link]: https://github.com/mayflo
[author-shield]: https://img.shields.io/badge/author-mayflo-orange?style=flat&logo=github
[buymecoffee-link]: https://www.buymeacoffee.com/mayflo
[buymecoffee-shield]: https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png
