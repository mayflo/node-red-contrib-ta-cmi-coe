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

        node.on('input', function(msg) {
            const blockInfo = getBlockInfo(node.dataType, node.outputNumber);
            let values, units;
            
            if (node.dataType === 'analog') {
                values = [undefined, undefined, undefined, undefined];
                units  = [undefined, undefined, undefined, undefined];
                
                const payloadValue = parseFloat(msg.payload);
                values[blockInfo.position] = isNaN(payloadValue) ? 0 : payloadValue;
                
                // Set unit for the specific output
                units[blockInfo.position] = 
                    (msg.coe && msg.coe.unit !== undefined) 
                    ? parseInt(msg.coe.unit) 
                    : node.unit;
                
            } else { // digital
                values = new Array(16).fill(undefined);
                values[blockInfo.position] = msg.payload ? 1 : 0;
                units = null;
            }
            
            node.status({
                fill: "yellow",
                shape: "dot",
                text: RED._("coe-output.status.queued") + `[v${node.coeVersion}]`
            });
            
            queueAndSend(node, RED._, node.nodeNumber, blockInfo.block, values, units, node.dataType, node.coeVersion, node.cmiConfig, node.cmiAddress, msg);
        });
        
        node.status({fill:"grey", shape:"ring", text:RED._("coe-output.status.ready") + ` [v${node.coeVersion}]`});
    }
    RED.nodes.registerType("coe-output", CoEOutputNode);
};