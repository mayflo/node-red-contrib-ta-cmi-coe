/**
 * CoE Monitor Node (Receives all CoE packets)
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    'use strict';
    const { getUnitInfo, getDigitalStateKey } = require('../lib/utils')

    function CoEMonitorNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node._ = RED._;
        
        node.cmiConfig = RED.nodes.getNode(config.cmiconfig);

        const lang = node.cmiConfig.lang;
        const coeVersion = node.cmiConfig.coeVersion || 1;
        
        if (!node.cmiConfig) {
            node.error("CMI Configuration missing");
            return;
        }
        
        node.filterNodeNumber = config.filterNodeNumber ? parseInt(config.filterNodeNumber) : null;
        node.filterDataType = config.filterDataType || 'all';
        node.includeRaw = config.includeRaw || false;

        let packetCount = 0;
        let lastUpdate = Date.now();

        const listener = (received) => { // Listener for incoming data
            if (!received || !received.data || !Array.isArray(received.data)) {
                node.warn('Received invalid data format');
                return;
            }

            for (let canNode of received.data) {
                if (!canNode) continue;

                if (node.filterNodeNumber !== null && // Filter by Node Number
                    node.filterNodeNumber !== 0 && 
                    canNode.nodeNumber !== node.filterNodeNumber) {
                    continue;
                }
                
                const isDigital = (canNode.dataType === 'digital'); // Filter by Data Type
                const isAnalog = !isDigital;
                
                if (node.filterDataType === 'analog' && !isAnalog) continue;
                if (node.filterDataType === 'digital' && !isDigital) continue;
                
                packetCount++;
                lastUpdate = Date.now();
                
                // Build message
                const msg = {
                    payload: {
                        timestamp: new Date().toISOString(),
                        sourceIP: received.sourceIP,
                        version: received.version,
                        nodeNumber: canNode.nodeNumber,
                        ...(canNode.blockNumber && { blockNumber: canNode.blockNumber}),
                        dataType: canNode.dataType
                    },
                    topic: `coe/monitor/${canNode.nodeNumber}/block/${canNode.dataType}`
                };
                
                // Additional Details for Digital/Analog Blocks
                const valuesDetailed = {};

                if (canNode.outputs) {
                    Object.entries(canNode.outputs).forEach(([outputNumber, output]) => {
                        const unitInfo = getUnitInfo(output.unit, lang);
                        const translationKey = getDigitalStateKey(output.unit, output.value, "coe-monitor.status.");

                        valuesDetailed[outputNumber] = {
                            value: output.value,
                            ...(isDigital && { state: node._(translationKey) }),
                            unit: output.unit,
                            unitName: unitInfo.name,
                            ...(isAnalog && { unitSymbol: unitInfo.symbol })
                        };
                    });
                    msg.payload.values = valuesDetailed;
                }
                
                // Raw Data
                if (node.includeRaw) {
                    msg.payload.raw = { raw: received.rawBuffer ? received.rawBuffer.toString('hex').toUpperCase() : null}
                }
                
                node.send(msg);

                // Status Update
                const dataTypeLabel = isDigital ? 'D' : 'A';
                node.status({
                    fill: "green", 
                    shape: "dot", 
                    text: node._("coe-monitor.status.node") + ` ${canNode.nodeNumber} ${dataTypeLabel} - ${packetCount} Pkts`
                });
            }
        };

        node.cmiConfig.registerListener(listener);
        node.status({fill: "grey", shape: "ring", text: node._("coe-monitor.status.monitoring") + "..."});

        // Status Update Timer (shows last activity)
        const statusTimer = setInterval(() => {
            const secsSinceUpdate = Math.floor((Date.now() - lastUpdate) / 1000);
            if (secsSinceUpdate > 10) {
                node.status({
                    fill: "yellow", 
                    shape: "ring", 
                    text: node._("coe-monitor.status.monitoring") + ` ${secsSinceUpdate}s - ${packetCount} Pkt. [v${coeVersion}]`
                });
            }
        }, 5000);

        node.on('close', function() {
            clearInterval(statusTimer);
            node.cmiConfig.unregisterListener(listener);
        });
    }
    RED.nodes.registerType("coe-monitor", CoEMonitorNode);
};