/**
 * Message Queueing and Debouncing Module
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const { createCoEPacket } = require('../lib/coe');

const blockStateCache = {};
const blockUnitsCache = {}; // Cache for units per block
const queuedBlock = {};
const blockTimers = {};
const DEBOUNCE_DELAY = 50; // ms (Time slot for message collection)

// Returns a copy of the current block state (values) for the given block
function getBlockState(key) {
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
function getBlockUnits(key) {
    if (!blockUnitsCache[key]) {
        // Only analog blocks have units
        if (dataType === 'analog') {
            blockUnitsCache[key] = [0, 0, 0, 0];
        } else {
            blockUnitsCache[key] = null;
        }
    }
    return blockUnitsCache[key] ? [...blockUnitsCache[key]] : null;
}

// Sets the current block units for the given block (analog only)
function setBlockUnits(key, units) {
    if (dataType === 'analog') {
        blockUnitsCache[key] = units ? [...units] : [0,0,0,0];
    } else {
        blockUnitsCache[key] = null;
    }
}

// Queues and debounces messages for a specific block
function queueAndSend(node, translate, value, unit, origMsg) {
    const blockKey = node.block.key;
    const blockNumber = node.block.number;
    const dataType = node.dataType;
    const nodeNumber = node.nodeNumber;
    const coeVersion = node.coeVersion;
    const cmiConfig = node.cmiConfig;
    const cmiAddress = node.cmiAddress;

    // New queueing logic
    let initialValues;
    let initialUnits;

    if (queuedBlock[blockKey]) {
        initialValues = [...queuedBlock[blockKey].values];
        initialUnits = queuedBlock[blockKey].units ? [...queuedBlock[blockKey].units] : null;
    } else {
        initialValues = getBlockState(blockKey);
        initialUnits = (dataType === 'analog') ? getBlockUnits(blockKey) : null;
    }

    // Merge incoming values/units with existing block state
    let mergedValues = initialValues;
    let mergedUnits = initialUnits;
    
    if (dataType === 'analog') {
        for (let i = 0; i < 4; i++) {
            if (value !== undefined && value !== null) {
                mergedValues[i] = value;
            }
            if (unit && unit !== undefined) {
                mergedUnits[i] = unit;
            }
        }
    } else {
        for (let i = 0; i < 16; i++) {
            if (value !== undefined) {
                mergedValues[i] = value;
            }
        }
    }

    if (!queuedBlock[blockKey]) { // Create queue, if none
            queuedBlock[blockKey] = {
                values: mergedValues,
                units: mergedUnits,
                node: node,
                timestamp: Date.now(),
                origMsg: origMsg || null
            };
        }
        
    // Delete existing timer if any
    if (blockTimers[blockKey]) {
        clearTimeout(blockTimers[blockKey]);
    }

    // Start a new timer to send the queued message after the debounce delay
    blockTimers[blockKey] = setTimeout(() => {
        const queued = queuedBlock[blockKey];
        if (queued) {
            const packet = createCoEPacket(
                nodeNumber,
                blockNumber,
                queued.values,
                queued.units,
                dataType,
                coeVersion
            );
            
            // Persist both values and units for the block
            setBlockState(blockKey, queued.values);
            if (dataType === 'analog') {
                setBlockUnits(blockKey, queued.units);
            }
            
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
                queued.node.send([queued.origMsg || null, { payload: debugPayload }]);
            } catch (err) {
                // Do not break sending on debug failure
                queued.node.warn(`Failed to send debug msg: ${err.message}`);
            }
                const mergedText = translate("coe-output.status.merged");
                const readyText = translate("coe-output.status.ready");

                cmiConfig.send(cmiAddress, packet);
                
                queued.node.status({
                    fill: "green",
                    shape: "dot",
                    text: `${mergedText} [${coeVersion}]`
                });
                
                setTimeout(() => {
                    queued.node.status({fill: "grey", shape: "ring", text: `${readyText} [v${coeVersion}]`});
                }, 2000);
                
                delete queuedBlock[blockKey];
                delete blockTimers[blockKey];
            }
        }, DEBOUNCE_DELAY);
}

module.exports = {
    queueAndSend
};