/**
 * CoE Monitor Node (Receives all CoE packets)
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    'use strict';
    const { Validate, getUnitInfo, getDigitalStateKey } = require('../lib/utils')

    function CoEMonitorNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node._ = RED._;
        
        node.cmiConfig = RED.nodes.getNode(config.cmiconfig);
        
        if (!node.cmiConfig) {
            node.error("No CMI config assigned to CoE Monitor node.");
            node.status({fill:"red", shape:"ring", text:"coe-monitor.status.noconfig"});
            return;
        }
        
        node.lang = node.cmiConfig?.lang || "en";
        node.coeVersion = node.cmiConfig.coeVersion || 1;
        node.filterNodeNumber = Validate.node(config.filterNodeNumber, true);
        node.filterDataType = Validate.type(config.filterDataType);
        node.includeRaw = config.includeRaw || false;

        const isFilteringByNode = (node.filterNodeNumber !== null && node.filterNodeNumber !== 0);
        const isFilteringByDataType = node.filterDataType.isDigital !== null;
        const filterText = (!isFilteringByNode && !isFilteringByDataType) ? "" : "ᐅ" + node.filterDataType.short + " " + node.filterNodeNumber;

        let packetCount = 0;
        let lastUpdate = Date.now();

        const listener = (received) => { // Listener for incoming data
            if (!received || !received.data || !Array.isArray(received.data)) {
                node.warn('Received invalid data format');
                return;
            }

            for (let canNode of received.data) {
                if (!canNode) continue;

                if (isFilteringByNode && canNode.nodeNumber !== node.filterNodeNumber) {
                    continue;
                }
                
                const isDigital = (canNode.dataType === 'digital'); // Filter by Data Type
                const isAnalog = !isDigital;
                
                if (node.filterDataType.long === 'analog' && !isAnalog) continue;
                if (node.filterDataType.long === 'digital' && !isDigital) continue;
                
                packetCount++;
                lastUpdate = Date.now();
                
                // Build message
                const msg = {
                    payload: {
                        sourceIP: received.sourceIP,
                        version: received.version,
                        nodeNumber: canNode.nodeNumber,
                        ...(canNode.blockNumber && { blockNumber: canNode.blockNumber}),
                        dataType: canNode.dataType,
                        timestamp: new Date().toISOString()
                    },
                    topic: `coe/monitor/${canNode.nodeNumber}/block/${canNode.dataType}`
                };
                
                // Additional Details for Digital/Analog Blocks
                const valuesDetailed = {};

                if (canNode.outputs) {
                    Object.entries(canNode.outputs).forEach(([outputNumber, output]) => {
                        const unitInfo = getUnitInfo(output.unit, node.lang);
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
        node.status({fill: "grey", shape: "ring", text: node._("coe-monitor.status.monitoring") + " " + filterText + "..."});

        // Status Update Timer (shows last activity)
        const statusTimer = setInterval(() => {
            const secsSinceUpdate = Math.floor((Date.now() - lastUpdate) / 1000);
            if (secsSinceUpdate > 10) {
                node.status({
                    fill: "yellow", 
                    shape: "ring", 
                    text: node._("coe-monitor.status.monitoring") + " " + filterText + ` ${secsSinceUpdate}s - ${packetCount} Pkt. [v${node.coeVersion}]`
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