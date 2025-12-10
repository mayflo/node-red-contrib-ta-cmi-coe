/**
 * CoE Output Node (Sending of values)
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    'use strict';
    const { getBlockInfo } = require('../lib/utils')
    const { queueAndSend } = require('../lib/queueing');

    function CoEOutputNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.cmiConfig = RED.nodes.getNode(config.cmiconfig);

        if (!node.cmiConfig) {
            node.error("CoE Configuration missing or invalid.");
            node.status({fill:"red", shape:"ring", text:"coe-output.status.noconfig"});
            return;
        }

        node.cmiAddress = node.cmiConfig.address;
        node.coeVersion = node.cmiConfig.coeVersion || 1;
        node.nodeNumber = parseInt(config.nodeNumber) || 1;
        node.outputNumber = parseInt(config.outputNumber) || 1;
        node.dataType = config.dataType || 'analog';
        node.unit = parseInt(config.unit) || 0;

        node.block = getBlockInfo(node.dataType, node.nodeNumber, node.outputNumber);
        
        // Filter configuration parameters
        node.minChange = parseFloat(config.minChange) || 1;
        node.blockingTime = parseFloat(config.blockingTime) || 10; // Seconds
        node.maxInterval = parseFloat(config.maxInterval) || 5;  // Minutes
        node.sendInitial = config.sendInitial !== false;  // Send initial value (default: true)
        
        // State tracking per output (not global!)
        node.lastSentValue = undefined;
        node.lastReceivedValue = undefined;
        node.lastReceivedUnit = null;
        node.lastSentTime = 0;
        node.lastInputTime = 0;
        
        node.forceSendTimer = null;
    
        node.on('input', function(msg) {
            const now = Date.now();
            node.lastInputTime = now;
            
            // Prepare values based on data type
            if (node.dataType === 'analog') {
                const payloadValue = parseFloat(msg.payload);
                node.lastReceivedValue = isNaN(payloadValue) ? 0 : payloadValue;
                node.lastReceivedUnit = (msg.coe && msg.coe.unit !== undefined) ? parseInt(msg.coe.unit) : node.unit;
            } else { // digital
                const payloadValue = msg.payload ? 1 : 0;
                node.lastReceivedValue = payloadValue;
                node.lastReceivedUnit = null;
            }

            setIntervalTimer(); // Restart watchdog

            // Filter based on sending conditions
            if (!shouldSend(node, now)) {
                setIntervalTimer();
                return;
            }

            queueAndSend(node, RED._, lastReceivedValue, lastReceivedUnit, msg);

            node.status({ // Update to queued
                fill: "yellow",
                shape: "dot",
                text: RED._("coe-output.status.queued") + ` [v${node.coeVersion}]`
            });

        });
        
        node.on('close', function() { // Clear timers on shutdown
            if (node.forceSendTimer) {
                clearTimeout(node.forceSendTimer);
                node.forceSendTimer = null;
            }
        });
        
        node.status({fill:"grey", shape:"ring", text:RED._("coe-output.status.ready") + ` [v${node.coeVersion}]`});

        // Start the sending interval timer
        function setIntervalTimer() {
            if (node.forceSendTimer) {
                clearTimeout(node.forceSendTimer);
                node.forceSendTimer = null;
            } 

            const checkInterval = node.maxInterval * 60 * 1000;
            
            node.forceSendTimer = setTimeout(() => {
                const now = Date.now();
                const timeSinceLastSend = (now - node.lastSentTime) / 1000 / 60;
                
                if (timeSinceLastSend >= node.maxInterval && node.lastReceivedValue !== undefined) {
                    node.status({
                        fill: "yellow",
                        shape: "dot",
                        text: RED._("coe-output.status.retransmit") + ` (${timeSinceLastSend.toFixed(0)}s) [v${node.coeVersion}]`
                    });
                    node.lastSentValue = node.lastReceivedValue;
                    node.lastSentTime = Date.now();
                    queueAndSend(node, RED._, lastReceivedValue, lastReceivedUnit, null);
                }
                
                setIntervalTimer(); // Restart watchdog for next check
            }, checkInterval);

        }   
    }
    
    // Check sending conditions
    function shouldSend(node, now) {
        let shouldSend = true;
        let blockReason = "";
        
        if (node.lastSentValue === undefined) { // First input
            shouldSend = true;
            blockReason = "Initial";
        } else {
            const timeSinceLastSend = (now - node.lastSentTime) / 1000; // seconds
            
            // Check size of value change
            if (node.datatype === 'analog') {
                const delta = Math.abs(node.lastReceivedValue - node.lastSentValue);
                if (node.minChange > 0 && delta < node.minChange) {
                    shouldSend = false;
                    blockReason = `Δ${delta.toFixed(2)} < ${node.minDelta}`;
                }
            }
            
            // Check blocking time
            if (shouldSend && node.blockingTime > 0 && timeSinceLastSend < node.blockingTime) {
                shouldSend = false;
                blockReason = `⏱ ${timeSinceLastSend.toFixed(0)}/${node.blockTime}s`;
            }
        }
        
        if (!shouldSend) { // Update status and state
            node.status({
                fill: "yellow",
                shape: "ring",
                text: RED._("coe-output.status.suppressed") + `: ${blockReason} [v${node.coeVersion}]`
            });
        } else {
            // Remember sent value and timestamp
            node.lastSentValue = value;
            node.lastSentTime = now;
        }
        return shouldSend;
    }
    
    RED.nodes.registerType("coe-output", CoEOutputNode);
};