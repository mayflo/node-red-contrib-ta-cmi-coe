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
        node._ = RED._;
        
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
        node.maxInterval = parseFloat(config.maxInterval) || 1;  // Minutes
        
        // State tracking per output (not global!)
        node.lastReceivedMsg = null;
        node.lastReceivedValue = undefined;
        node.lastReceivedUnit = null;
        node.lastSentValue = undefined;
        node.lastSentTime = 0;
        node.lastInputTime = 0;
        
        node.intervalTimer = null;
    
        node.on('input', function(msg) {
            node.lastInputTime = Date.now();
            const timeSinceLastSend = (node.lastInputTime - node.lastSentTime) / 1000; // Seconds
            const isSupressed = checkSuppressCondition(node, timeSinceLastSend);
            node.lastReceivedMsg = msg;
            
            // Prepare last received values
            const payloadValue = parseFloat(msg.payload);
            node.lastReceivedValue = isNaN(payloadValue) ? 0 : payloadValue;
            node.lastReceivedUnit = (msg.coe && msg.coe.unit !== undefined) ? parseInt(msg.coe.unit) : node.unit;


            // Filter based on sending conditions
            if (isSupressed > 0) { 
                if (isSupressed === 1) { // Suppressed due to blocking time
                    setblockingTimer(timeSinceLastSend);
                    }
                return;
                }

            if (node.blockingTimer) {
                clearTimeout(node.blockingTimer);
                node.blockingTimer = null;
            }

            setIntervalTimer(); // Restart interval timer

            queueAndSend(node);
            node.lastSentValue = node.lastReceivedValue;
            node.lastSentTime = Date.now();

            node.status({ // Update to queued
                fill: "yellow",
                shape: "dot",
                text: node._("coe-output.status.queued") + ` [v${node.coeVersion}]`
            });
        });
        
        node.on('close', function() { // Clear timers on shutdown
            if (node.intervalTimer) {
                clearTimeout(node.intervalTimer);
                node.intervalTimer = null;
            }
            if (node.blockingTimer) {
                clearTimeout(node.blockingTimer);
                node.blockingTimer = null;
            }
        });
        
        node.status({fill:"grey", shape:"ring", text:node._("coe-output.status.ready") + ` [v${node.coeVersion}]`});

        // Start the sending interval timer
        function setIntervalTimer() {
            if (node.intervalTimer) {
                clearTimeout(node.intervalTimer);
                node.intervalTimer = null;
            } 

            const checkInterval = node.maxInterval * 60 * 1000;
            
            node.intervalTimer = setTimeout(() => { // Interval elapsed, retransmit last value
                const now = Date.now();
                const timeSinceLastSend = (now - node.lastSentTime) / 1000 / 60;
                
                queueAndSend(node);
                node.lastSentValue = node.lastReceivedValue;
                node.lastSentTime = Date.now();

                if (node.lastReceivedValue !== undefined) {
                    node.status({
                        fill: "yellow",
                        shape: "dot",
                        text: node._("coe-output.status.retransmit") + ` (${timeSinceLastSend.toFixed(0)} Min) [v${node.coeVersion}]`
                    });
                }     
                setTimeout(() => {
                    node.status({fill: "grey", shape: "ring", text: node._("coe-output.status.ready") + ` [v${node.coeVersion}]`});
                }, 5000);
                
                setIntervalTimer(); // Restart interval timer
            }, checkInterval);

        }
        
        function setblockingTimer(timeSinceLastSend) {
            if (node.blockingTimer) {
                clearTimeout(node.blockingTimer);
                node.blockingTimer = null;
            }

            const blockingTimeMs = (node.blockingTime - timeSinceLastSend) * 1000;

            node.blockingTimer = setTimeout(() => {
                if (node.lastReceivedValue !== undefined) {
                    node.status({
                        fill: "yellow",
                        shape: "dot",
                        text: node._("coe-output.status.queued") + ` [v${node.coeVersion}]`
                    });

                    queueAndSend(node);
                    node.lastSentValue = node.lastReceivedValue;
                    node.lastSentTime = Date.now();
                    setIntervalTimer()
                }
            }, blockingTimeMs);
        }
    }
    
    // Checks if message should be suppressed based on sending conditions
    function checkSuppressCondition(node, timeSinceLastSend) {
        let isSuppressed = 0;
        let blockReason = "";
        
        if (node.lastSentValue === undefined) { // First input
            isSuppressed = 0;
            blockReason = "Initial";
        } else {
            
            // Check blocking time
            if (node.blockingTime > 0 && timeSinceLastSend < node.blockingTime) {
                isSuppressed = 1;
                blockReason = `⏱ ${timeSinceLastSend.toFixed(0)}/${node.blockingTime}s`;
            }

            // Check size of value change
            if (node.dataType === 'analog') {
                const delta = Math.abs(node.lastReceivedValue - node.lastSentValue);
                if (node.minChange > 0 && delta < node.minChange) {
                    isSuppressed = 2;
                    blockReason = `Δ${delta.toFixed(2)} < ${node.minChange}`;
                }
            }
        }
        
        if (isSuppressed > 0) { // Update status and state
            node.status({
                fill: "yellow",
                shape: "ring",
                text: node._("coe-output.status.blocked") + `: ${blockReason} [v${node.coeVersion}]`
            });
        }

        return isSuppressed;
    }
    
    RED.nodes.registerType("coe-output", CoEOutputNode);
};