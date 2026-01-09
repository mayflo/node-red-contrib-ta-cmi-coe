/**
 * CoE Input Node
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    'use strict';
    const { getUnitInfo, getDigitalStateKey, mergeNodeData, createEmptyState } = require('../lib/utils');

    // CoE Input Node (receiving values)
    function CoEInputNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node._ = RED._;
        
        node.cmiConfig = RED.nodes.getNode(config.cmiconfig);
    
        if (!node.cmiConfig) {
            node.error("CMI Configuration missing");
            return;
        }
        
        node.cmiAddress = node.cmiConfig.address;
        node.coeVersion = node.cmiConfig.coeVersion || 1;
        node.lang = node.cmiConfig.lang;
        node.nodeNumber = parseInt(config.nodeNumber) || 0;
        node.outputNumber = parseInt(config.outputNumber) || 1;
        node.dataType = config.dataType || 'analog';
   
        // State management for LKGVs (Last Known Good Values) per block
        node.canNodeState = {};

        // Set Timer for CoE timeout
        const timeoutMs = (config.timeout || 20) * 60 * 1000; // Timeout in milliseconds
        let timeoutTimer = null;
        let currentNodeText = "";
        
        // Listener for incoming data
        const listener = (received) => {
            // Data is now: { data, sourceIP, version, timestamp }
            if (!received || !received.data || !Array.isArray(received.data)) {
                node.warn('Received invalid data format');
                return;
            }
            
            let foundMatchingBlock = false;

            for (let canNode of received.data) {
                if (!canNode) continue;
                
                const nodeKey = `${canNode.nodeNumber}-${canNode.dataType}`;

                // Filter Node number (if > 0)
                if (node.nodeNumber > 0 && canNode.nodeNumber !== node.nodeNumber) {
                    continue;
                }
                
                // Filter dataType number
                if (canNode.dataType !== node.dataType) {
                    continue;
                }
                
                // Merge blocks
                let currentState = node.canNodeState[nodeKey];
                if (!currentState) {
                    currentState = createEmptyState(canNode);
                }
                
                const mergedCanNode = mergeNodeData(currentState, canNode);
                node.canNodeState[nodeKey] = mergedCanNode;
                
                // Extract Values, Units from merged block                
                let value, unit, state;

                // Ensure the requested output exists in merged outputs
                const output = mergedCanNode.outputs ? mergedCanNode.outputs[node.outputNumber] : undefined;
                if (!output) {
                    continue;
                }

                if (node.dataType === 'analog') {
                    value = output.value;
                    unit = output.unit;
                    state = value;
                } else {
                    value = output.value ? true : false;
                    unit = output.unit;
                    const translationKey = getDigitalStateKey(unit, value, "coe-input.status.");
                    state = node._(translationKey);
                }

                // Build message
                const unitInfo = getUnitInfo(unit, node.lang);
                const msg = {
                    payload: value,
                    topic: `coe/${node.nodeNumber || mergedCanNode.nodeNumber}/${node.dataType}/${node.outputNumber}`,
                    coe: {
                        timestamp: received.timestamp,
                        sourceIP: received.sourceIP,
                        nodeNumber: mergedCanNode.nodeNumber,
                        dataType: node.dataType,
                        outputNumber: node.outputNumber,
                        state: state,
                        unit: unit,
                        unitName: unitInfo.name,
                        unitSymbol: unitInfo.symbol
                        // raw: received.rawBuffer ? received.rawBuffer.toString('hex').toUpperCase() : null
                    }
                };
                
                if (value !== undefined) { // Send only, if value is defined in block
                     node.send(msg);
                }
                
                currentNodeText = `${state} ${unitInfo.symbol || ''} [v${node.coeVersion}]` // Caching last Node text

                node.status({
                    fill: "green", 
                    shape: "dot", 
                    text: currentNodeText
                });
                
                foundMatchingBlock = true;
            }
            if (foundMatchingBlock) {
                resetTimeout();
            }
        };

        node.cmiConfig.registerListener(listener);
        
        // Reset CoE Timeout
        function resetTimeout() {
            if (timeoutTimer) clearTimeout(timeoutTimer);
            timeoutTimer = setTimeout(() => {
                node.status({ fill: "red", shape: "dot", text: `${currentNodeText} (Timeout)` });
            }, timeoutMs);
        }
        
        // Status information, including if filtered
        if (node.nodeNumber === 0) {
            node.status({fill: "yellow", shape: "ring", text: "coe-input.status.waitingAny"});
        } else {
            node.status({fill: "grey", shape: "ring", text: "coe-input.status.waiting"});
        }
        
        node.on('close', function() {
            node.cmiConfig.unregisterListener(listener);
        });

    }

    RED.nodes.registerType("coe-input", CoEInputNode);
};