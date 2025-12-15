/**
 * Message Queueing and Debouncing Module
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const { createPacket } = require('./protocol');

const blockStateCache = {};
const blockUnitsCache = {}; // Cache for units per block
const queuedBlock = {};
const blockTimers = {};
const DEBOUNCE_DELAY = 50; // ms (Time slot for message collection)

// Returns a copy of the current block state (values) for the given block
function getBlockState(key, dataType) {
    if (!blockStateCache[key]) {
        if (dataType === 'analog') {
            blockStateCache[key] = [0, 0, 0, 0];
        } else {
            blockStateCache[key] = new Array(16).fill(0);
        }
    }
    // Return a copy to avoid accidental external mutation
    return Array.isArray(blockStateCache[key]) ? [...blockStateCache[key]] : blockStateCache[key];
}

// Sets the current block state (values) for the given block
function setBlockState(key, values) {
    blockStateCache[key] = [...values];
}

// Returns a copy of the current block units for the given block (analog only)
function getBlockUnits(key, dataType) {
    if (!blockUnitsCache[key]) {
        if (dataType === 'analog') {
            blockUnitsCache[key] = [0, 0, 0, 0];
        } else {
            blockUnitsCache[key] = new Array(16).fill(0);
        }
    }
    return blockUnitsCache[key] ? [...blockUnitsCache[key]] : 0;
}

// Sets the current block units for the given block (analog only)
function setBlockUnits(key, dataType, units) {
    if (dataType === 'analog') {
        blockUnitsCache[key] = units ? [...units] : [0,0,0,0];
    } else {
        blockUnitsCache[key] = units ? [...units] : new Array(16).fill(0);
    }
}

// Queues and debounces messages for a specific block
function queueAndSend(node) {
    const value = node.lastReceivedValue;
    const unit = node.lastReceivedUnit;
    const origMsg = node.lastReceivedMsg;
    const blockKey = node.block.key;
    const blockNumber = node.block.number;
    const blockPosition = node.block.position;
    const dataType = node.dataType;
    const nodeNumber = node.nodeNumber;
    const coeVersion = node.coeVersion;
    const cmiConfig = node.cmiConfig;
    const cmiAddress = node.cmiAddress;

    // New queueing logic
    let initialValues;
    let initialUnits;

    let participatingNodes = new Set();

    if (queuedBlock[blockKey]) {
        initialValues = [...queuedBlock[blockKey].values];
        initialUnits = queuedBlock[blockKey].units ? [...queuedBlock[blockKey].units] : null;
        participatingNodes = queuedBlock[blockKey].nodes;
    } else {
        initialValues = getBlockState(blockKey, dataType);
        initialUnits = getBlockUnits(blockKey, dataType);
    }

    // Merge incoming values/units with existing block state
    let mergedValues = initialValues;
    let mergedUnits = initialUnits;

    if (value !== undefined && value !== null) {
        mergedValues[blockPosition] = value;
    }

    if (unit !== undefined && unit !== null) {
        mergedUnits[blockPosition] = unit;
    }
 
    participatingNodes.add(node);

    if (!queuedBlock[blockKey]) { // Create queue, if none
            queuedBlock[blockKey] = {
                values: mergedValues,
                units: mergedUnits,
                nodes: participatingNodes,
                timestamp: Date.now(),
                origMsg: origMsg || null
            };
        } else { // Update existing queue
            queuedBlock[blockKey].values = mergedValues;
            queuedBlock[blockKey].units = mergedUnits;
            queuedBlock[blockKey].nodes = participatingNodes;
            queuedBlock[blockKey].origMsg = origMsg || null; // Keeps the last original message
        }
        
    // Delete existing timer if any
    if (blockTimers[blockKey]) {
        clearTimeout(blockTimers[blockKey]);
    }

    // Start a new timer to send the queued message after the debounce delay
    blockTimers[blockKey] = setTimeout(() => {
        const queued = queuedBlock[blockKey];
        if (queued) {
            const packet = createPacket[coeVersion](
                nodeNumber,
                blockNumber,
                queued.values,
                queued.units,
                dataType
            );
            
            // Persist both values and units for the block
            setBlockState(blockKey, queued.values);
            setBlockUnits(blockKey, dataType, queued.units);

            cmiConfig.send(cmiAddress, packet);

            const now = Date.now();
            const mergedText = node._("coe-output.status.merged");
            const readyText = node._("coe-output.status.ready");

            queued.nodes.forEach(participatingNode => {

                participatingNode.lastSentValue = queued.values[participatingNode.block.position];
                participatingNode.lastSentTime = now;
            
                participatingNode.status({
                    fill: "green",
                    shape: "dot",
                    text: `${mergedText} [v${coeVersion}]`
                });
                setTimeout(() => {
                    participatingNode.status({fill: "grey", shape: "ring", text: `${readyText} [v${coeVersion}]`});
                }, 5000);

                // Send debug output on the node outputs: [original msg, debug info]
                try {
                    const debugPayload = {
                        debug: {
                            hex: packet.toString('hex').toUpperCase(),
                            node: nodeNumber,
                            block: blockNumber,
                            dataType: dataType,
                            version: coeVersion,
                            blockState: queued.values,
                            units: queued.units
                        }
                    };
                    // If node has outputs, send original msg on first output and debug on second
                    participatingNode.send([queued.origMsg || null, { payload: debugPayload }]);
                } catch (err) {
                    // Do not break sending on debug failure
                    participatingNode.warn(`Failed to send debug msg: ${err.message}`);
                }

            });
                
            delete queuedBlock[blockKey];
            delete blockTimers[blockKey];
        }
    }, DEBOUNCE_DELAY);
}

module.exports = {
    queueAndSend
};