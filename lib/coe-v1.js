/**
 * CoE V1 Protocol Support Module
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const { convertRawToValue, convertValueToRaw } = require('./utils');

// CoE V1 Parse message from buffer
function parsePacket(buffer) {

    if (buffer.length !== 14) {
        console.warn(`Received CoE packet with incorrect length of ${buffer.length} bytes (v1).`);
        return null;
    }

    // Parse header
    const nodeNumber = buffer.readUInt8(0);
    const blockNumber = buffer.readUInt8(1);
    
    let values = [];
    let units = [];
    
    if (blockNumber === 0 || blockNumber === 9) {
        // digital
        const bitField = buffer.readUInt16LE(2);
        const unitId = buffer.readUInt8(11); // Block-wise unit id → byte 11
        for (let i = 0; i < 16; i++) {
            values.push((bitField >> i) & 1);
            units.push(unitId);
        }
    } else {
        // analog V1
        for (let i = 0; i < 4; i++) {
            const value = buffer.readInt16LE(2 + i * 2);
            const unitId = buffer.readUInt8(10 + i);
            
            const convertedValue = convertRawToValue(value, unitId, 1); // V1 decimals
            values.push(convertedValue);
            units.push(unitId);
        }
    }
    
    return [{
        nodeNumber: nodeNumber,
        blockNumber: blockNumber,
        values: values,
        units: units
    }];
}

// Create CoE Packet from values
function createPacket(nodeNumber, blockNumber, values, units, dataType) {
    
    let buffer;
    
    if (dataType === 'digital') {
        buffer = Buffer.alloc(14);
        buffer.writeUInt8(nodeNumber, 0);
        buffer.writeUInt8(blockNumber, 1);
        
        let bitField = 0;
        for (let i = 0; i < 16; i++) {
            if (values[i]) {
                bitField |= (1 << i);
            }
        }
        buffer.writeUInt16LE(bitField, 2);
        buffer.fill(0, 4, buffer.length);
        
    } else { // analog
        buffer = Buffer.alloc(14);
        buffer.writeUInt8(nodeNumber, 0);
        buffer.writeUInt8(blockNumber, 1);
        
        for (let i = 0; i < 4; i++) {
            const unitId = units ? units[i] : 0;
            const rawValue = convertValueToRaw(values[i], unitId, 1); // V1 Decimal places
            
            if (rawValue > 32767 || rawValue < -32768) {
                console.warn(`Value ${values[i]} exceeds V1 limits. Consider using V2.`);
            }
            
            buffer.writeInt16LE(Math.max(-32768, Math.min(32767, rawValue)), 2 + i * 2);
            buffer.writeUInt8(unitId, 10 + i);
        }
    }
    
    return buffer;
}

module.exports = { 
    parsePacket, 
    createPacket
};