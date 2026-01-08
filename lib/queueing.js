/**
 * Message Queueing and Debouncing Module
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const { createPacket } = require('./protocol');

const blockTimers = {};
const DEBOUNCE_DELAY = 50; // ms (Time slot for message collection)
const outputStateCache = {};
const queuedState = {};

// Persist output state for a specific block
function setOutputState(queueKey, output) {
    outputStateCache[queueKey] = {
        ...outputStateCache[queueKey],
        outputs: output
    };  
}

// Return a copy of the current message state
function getOutputState(node, queueKey) {
    if (!outputStateCache[queueKey]) {
        outputStateCache[queueKey] = {
            nodeNumber: node.nodeNumber,
            dataType: node.dataType,
            outputs: {}
        }
    }
    return { ...outputStateCache[queueKey] };
}


// Queues and debounces messages for a specific block
function queueAndSend(node) {
    const valueState = {output: node.outputNumber, value: node.lastReceivedValue, unit: node.lastReceivedUnit};
    const origMsg = node.lastReceivedMsg;
    const queueKey = node.queueKey;
    const coeVersion = node.coeVersion;
    const cmiConfig = node.cmiConfig;
    const cmiAddress = node.cmiAddress;

    // New queueing logic
    let initialOutputState;
    let participatingNodes = new Set();

    if (queuedState[queueKey]) {
        participatingNodes = queuedState[queueKey].participating.add(node);
    } else {
        queuedState[queueKey] = {
            timestamp: Date.now(),
            participating: participatingNodes.add(node),
            origMsg: origMsg || null
        }
    }

    initialOutputState = getOutputState(node, queueKey).outputs;

    // Merge incoming values/units with existing block state
    let mergedOutputState = initialOutputState;

    if (valueState.output !== undefined && valueState.output !== null) {
        mergedOutputState[valueState.output] = { 
            value: valueState.value, 
            unit: valueState.unit 
        };
    }

    // Delete existing timer if any
    if (blockTimers[queueKey]) {
        clearTimeout(blockTimers[queueKey]);
    }

    // Start a new timer to send the queued message after the debounce delay
    blockTimers[queueKey] = setTimeout(() => {
        const nodeNumber = outputStateCache[queueKey].nodeNumber;
        const dataType = outputStateCache[queueKey].dataType;
        const queued = mergedOutputState;
        if (outputStateCache[queueKey]) {
            const packet = createPacket[coeVersion](
                nodeNumber,
                dataType,
                queued
            );
            
            // Persist the merged output state for the queue
            setOutputState(queueKey, queued);

            cmiConfig.send(cmiAddress, packet);

            const now = Date.now();
            const mergedText = node._("coe-output.status.merged");
            const readyText = node._("coe-output.status.ready");

            queuedState[queueKey].participating.forEach(participatingNode => {
                const outputNumber = participatingNode.outputNumber;

                // Guard against missing sparse entries
                participatingNode.lastSentValue = (queued[outputNumber] && queued[outputNumber].value !== undefined) ? queued[outputNumber].value : undefined;
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
                            node: nodeNumber,
                            dataType: dataType,
                            output: outputNumber,
                            value: queued[outputNumber] ? queued[outputNumber].value : undefined,
                            unit: queued[outputNumber] ? queued[outputNumber].unit : undefined
                            // raw: packet.toString('hex').toUpperCase()
                        }
                    };
                    // If node has outputs, send original msg on first output and debug on second
                    participatingNode.send([queuedState[queueKey].origMsg || null, { payload: debugPayload }]);
                } catch (err) {
                    // Do not break sending on debug failure
                    participatingNode.warn(`Failed to send debug msg: ${err.message}`);
                }

            });
                
            delete queuedState[queueKey];
            delete blockTimers[queueKey];
        }
    }, DEBOUNCE_DELAY);
}

module.exports = {
    queueAndSend
};