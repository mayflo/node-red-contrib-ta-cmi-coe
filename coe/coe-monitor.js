/**
 * CoE Monitor Node (Receives all CoE packets)
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    'use strict';
    const { getUnitInfo } = require('../lib/utils')

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

        const listener = (data) => { // Listener for incoming data
            if (!data || !data.blocks || !Array.isArray(data.blocks)) {
                node.warn('Received invalid data format');
                return;
            }

            for (let block of data.blocks) {
                if (!block) continue;

                if (node.filterNodeNumber !== null && // Filter by Node Number
                    node.filterNodeNumber !== 0 && 
                    block.nodeNumber !== node.filterNodeNumber) {
                    continue;
                }
                
                const isDigital = (block.blockNumber === 0 || block.blockNumber === 9); // Filter by Data Type
                const isAnalog = !isDigital;
                
                if (node.filterDataType === 'analog' && !isAnalog) continue;
                if (node.filterDataType === 'digital' && !isDigital) continue;
                
                packetCount++;
                lastUpdate = Date.now();
                
                // Build message
                const msg = {
                    payload: {
                        nodeNumber: block.nodeNumber,
                        blockNumber: block.blockNumber,
                        dataType: isDigital ? 'digital' : 'analog',
                        values: block.values,
                        units: block.units,
                        sourceIP: data.sourceIP,
                        version: data.version,
                        timestamp: new Date().toISOString(),
                        rawBuffer: data.rawBuffer ? data.rawBuffer.toString('hex').toUpperCase() : null
                    },
                    topic: `coe/monitor/${block.nodeNumber}/block/${block.blockNumber}`
                };
                
                // Additional Details for Analog Blocks
                if (isAnalog && block.units) {
                    msg.payload.valuesDetailed = block.values.map((value, idx) => {
                        const unitInfo = getUnitInfo(block.units[idx], lang);
                        RED.log.debug(`Unit Info for unit ${block.units[idx]}: ${JSON.stringify(unitInfo)} + version: ${coeVersion} + key: ${unitInfo.key} + symbol: ${unitInfo.symbol}`);
                        const outputNumber = (block.blockNumber - 1) * 4 + idx + 1;
                        return {
                            outputNumber: outputNumber,
                            value: value,
                            unit: block.units[idx],
                            unitName: unitInfo.name,
                            unitSymbol: unitInfo.symbol
                        };
                    });
                }
                
                // Additional Details for Digital Blocks
                if (isDigital) {
                    const baseOutput = block.blockNumber === 0 ? 1 : 17;
                    msg.payload.valuesDetailed = block.values.map((value, idx) => ({
                        outputNumber: baseOutput + idx,
                        value: value === 1,
                        state: value === 1 ? 'ON' : 'OFF'
                    }));
                }
                
                // Raw Data
                if (node.includeRaw) {
                    msg.payload.raw = block;
                }
                
                node.send(msg);

                // Status Update
                const dataTypeLabel = isDigital ? 'D' : 'A';
                node.status({
                    fill: "green", 
                    shape: "dot", 
                    text: node._("coe-monitor.status.node") + ` ${block.nodeNumber} B${block.blockNumber}[${dataTypeLabel}] - ${packetCount} Pkts`
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