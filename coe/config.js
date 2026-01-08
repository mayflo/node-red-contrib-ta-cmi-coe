/**
 * CMI Configuration Node & Shared UDP socket
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    "use strict";
    const dgram = require('dgram');
    const { parsePacket } = require('../lib/protocol');

    // CoE Protocol Ports
    const COE_PORT1 = 5441; // CoE v1
    const COE_PORT2 = 5442; // CoE v2

    function CMIConfigNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
    
        let langSetting = (RED.settings.lang || "").toLowerCase();
        switch (true) {
        case langSetting.startsWith("de"):
            node.lang = "de";
            break;
        default:
            node.lang = "en";
        }

        node.address = config.address || '192.168.0.100';
        node.coeVersion = parseInt(config.coeVersion) || 1;
        node.port = (node.coeVersion === 2) ? COE_PORT2 : COE_PORT1;
        node.localAddress = config.localip || '0.0.0.0';
        node.socket = null;
        node.listeners = [];

        // Add UDP Socket
        try {
            node.socket = dgram.createSocket({
                type: 'udp4',
                reuseAddr: true  // Enable Socket Reuse
            });
            
            node.socket.on('message', (msg, rinfo) => {
                const data = parsePacket[node.coeVersion](msg);
                
                if (data && data.length > 0) {
                    const received = { // Wrapper object for meta info
                        data: data,
                        sourceIP: rinfo.address,
                        version: node.coeVersion,
                        timestamp: Date.now(),
                        rawBuffer: msg
                    };

                    node.listeners.forEach(listener => { // Notify all listeners
                        try {
                            listener(received);
                        } catch(err) {
                            node.error(`Listener error: ${err.message}`);
                        }
                    });
                }
            });

            node.socket.on('error', (err) => {
                node.error(`UDP Socket Error: ${err.message}`);
            });

            node.socket.bind(node.port, node.localAddress, () => {
                node.log(`CoE UDP Socket is listening on ${node.localAddress}:${node.port} (CoE V${node.coeVersion})`);
            });

        } catch(err) {
            node.error(`Failed to create UDP socket: ${err.message}`);
        }

        node.registerListener = function(callback) { // Add listener
            node.listeners.push(callback);
        };

        node.unregisterListener = function(callback) { // Remove listener
            const index = node.listeners.indexOf(callback);
            if (index > -1) {
                node.listeners.splice(index, 1);
            }
        };

        node.send = function(host, packet) { // Send data
            if (node.socket) {
                node.socket.send(packet, 0, packet.length, node.port, host, (err) => {
                    if (err) {
                        node.error(`Failed to send: ${err.message}`);
                    }
                });
            }
        };

        node.on('close', function() { // Cleanup on node shutdown
            if (node.socket) {
                node.socket.close();
            }
        });
    }
    RED.nodes.registerType("cmiconfig", CMIConfigNode);

};