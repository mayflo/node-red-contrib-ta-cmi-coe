/**
 * CoE Input Node
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    'use strict';
    const { getBlockInfo, getUnitInfo, mergeBlockData, createEmptyState } = require('../lib/utils');

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
        node.blockState = {};
        
        // Calculate block & position
        const block = getBlockInfo(node.dataType, node.nodeNumber, node.outputNumber);

        // Set Timer for CoE timeout
        const timeoutMs = (config.timeout || 20) * 60 * 1000; // Timeout in milliseconds
        let timeoutTimer = null;
        let currentNodeText = "";
        
        // Listener for incoming data
        const listener = (data) => {
            // Data is now: { blocks, sourceIP, version, timestamp }
            if (!data || !data.blocks || !Array.isArray(data.blocks)) {
                node.warn('Received invalid data format');
                return;
            }
            
            let foundMatchingBlock = false;

            for (let incomingBlock of data.blocks) {
                if (!incomingBlock) continue;
                
                const blockKey = `${incomingBlock.nodeNumber}-${incomingBlock.blockNumber}`;

                // Filter Node number (if > 0)
                if (node.nodeNumber > 0 && incomingBlock.nodeNumber !== node.nodeNumber) {
                    continue;
                }
                
                // Filter Block number
                if (incomingBlock.blockNumber !== block.number) {
                    continue;
                }
                
                // Merge blocks
                let currentState = node.blockState[blockKey];
                if (!currentState) {
                    currentState = createEmptyState(incomingBlock);
                }
                
                const mergedBlock = mergeBlockData(currentState, incomingBlock);
                node.blockState[blockKey] = mergedBlock;
                
                // Extract Values, Units from merged block                
                let value, unit, state; 
                if (node.dataType === 'analog') {
                    value = mergedBlock.values[block.position];
                    unit = mergedBlock.units ? mergedBlock.units[block.position] : null;
                    state = value;
                } else {
                    value = mergedBlock.values[block.position] ? true : false;
                    unit = mergedBlock.units ? mergedBlock.units[block.position] : null;
                    state = node._(getDigitalState(unit, value));
                }

                // Build message
                const unitInfo = getUnitInfo(unit, node.lang);
                const msg = {
                    payload: value,
                    topic: `coe/${node.nodeNumber || mergedBlock.nodeNumber}/${node.dataType}/${node.outputNumber}`,
                    coe: {
                        nodeNumber: mergedBlock.nodeNumber,
                        blockNumber: mergedBlock.blockNumber,
                        outputNumber: node.outputNumber,
                        dataType: node.dataType,
                        version: data.version,
                        unit: unit,
                        state: state,
                        unitName: unitInfo.name,
                        unitSymbol: unitInfo.symbol,
                        sourceIP: data.sourceIP,
                        timestamp: data.timestamp,
                        raw: mergedBlock
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
    
        function getDigitalState(unit, value) {
            const unitKey = "coe-input.status.";
            switch (unit) {
                    case 43:
                        return unitKey + (value ? "on" : "off");
                    case 44:
                        return unitKey + (value ? "yes" : "no");
                    case 78:
                        return unitKey + (value ? "open" : "closed");
                    default:
                        return unitKey + (value ? "on" : "off");
                }
        }
    }

    RED.nodes.registerType("coe-input", CoEInputNode);
};