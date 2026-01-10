/**
 * CoE Input Node
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    'use strict';
    const { Validate, getUnitInfo, getDigitalStateKey, mergeNodeData, createEmptyState } = require('../lib/utils');

    // CoE Input Node (receiving values)
    function CoEInputNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        node._ = RED._;
        
        node.cmiConfig = RED.nodes.getNode(config.cmiconfig);
    
        if (!node.cmiConfig) {
            node.error("No CMI config assigned to CoE Input node.");
            node.status({fill:"red", shape:"ring", text:"coe-input.status.noconfig"});
            return;
        }
        
        node.cmiAddress = node.cmiConfig.address || "";
        node.coeVersion = node.cmiConfig.coeVersion || 1;
        node.lang = node.cmiConfig?.lang || "en";
        node.nodeNumber = Validate.node(config.nodeNumber, true);
        node.outputNumber = Validate.output(config.outputNumber, node.coeVersion);
        node.dataType = Validate.type(config.dataType);
   
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
                if (canNode.dataType !== node.dataType.long) {
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

                if (node.dataType.long === 'analog') {
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
                    topic: `coe/${node.nodeNumber || mergedCanNode.nodeNumber}/${node.dataType.long}/${node.outputNumber}`,
                    coe: {
                        sourceIP: received.sourceIP,
                        nodeNumber: mergedCanNode.nodeNumber,
                        dataType: node.dataType.long,
                        outputNumber: node.outputNumber,
                        state: state,
                        unit: unit,
                        unitName: unitInfo.name,
                        unitSymbol: unitInfo.symbol,
                        timestamp: received.timestamp
                        // raw: received.rawBuffer ? received.rawBuffer.toString('hex').toUpperCase() : null
                    }
                };
                
                if (value !== undefined) { // Send only, if value is defined in block
                     node.send(msg);
                }
                
                currentNodeText = `${state} ${unitInfo.symbol || ''}` // Caching last Node text

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

        resetTimeout(); // Set initial timeout
        
        // Reset CoE Timeout
        function resetTimeout() {
            if (timeoutTimer) clearTimeout(timeoutTimer);

            // Fallback status text (initial timeout)
            const statusText = currentNodeText ? `${currentNodeText} (Timeout)` : node._("coe-input.status.initialTimeout");
            
            timeoutTimer = setTimeout(() => {
                node.status({ fill: "red", shape: "dot", text: statusText });
            }, timeoutMs);
        }
        
        // Status information, including if filtered
        if (node.nodeNumber === 0) {
            node.status({fill: "yellow", shape: "ring", text: node._("coe-input.status.waitingAny") + ` [v${node.coeVersion}]`});
        } else {
            node.status({fill: "grey", shape: "ring", text: "ᐅ" + node.dataType.short + " " + node.nodeNumber + "/" + node.outputNumber + " " + node._("coe-input.status.waiting") + ` [v${node.coeVersion}]`});
        }
        
        node.on('close', function() {
            node.cmiConfig.unregisterListener(listener);

            if (timeoutTimer) {
                clearTimeout(timeoutTimer);
            }
        });

    }

    RED.nodes.registerType("coe-input", CoEInputNode);
};