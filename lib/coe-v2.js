/**
 * CoE V2 Protocol Support Module
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const { convertCoEToValue, convertValueToCoE } = require('./utils.js');

// CoE V2 Parsing function
function parseCoEV2Packet(buffer) {
    if (buffer.length < 4) {
        return null;
    }
    
    // Parse header
    const versionLow = buffer.readUInt8(0);
    const versionHigh = buffer.readUInt8(1);
    const messageLength = buffer.readUInt8(2);
    const blockCount = buffer.readUInt8(3);
    
    if (versionLow !== 0x02 || versionHigh !== 0x00) { // Validate version
        console.warn(`V2: Ungültige Version: ${versionLow}.${versionHigh}`);
        return null;
    }
    
    const expectedLength = 4 + (blockCount * 8);
    if (buffer.length !== expectedLength) {
        console.warn(`Received CoE packet with incorrect length. Expected: ${expectedLength}, Received: ${buffer.length} (V2)`);
        return null;
    }
    
    // Parse value blocks
    const blocks = [];
    for (let i = 0; i < blockCount; i++) {
        const offset = 4 + (i * 8);
        const canNode = buffer.readUInt8(offset);
        const outputNumber = buffer.readUInt16LE(offset + 1);
        const unitId = buffer.readUInt8(offset + 3);
        const value = buffer.readInt32LE(offset + 4);
        
        blocks.push({
            canNode: canNode,
            outputNumber: outputNumber,
            unitId: unitId,
            value: value,
            isDigital: outputNumber <= 254,
            isAnalog: outputNumber > 254
        });
    }
    
    return {
        version: 2,
        messageLength: messageLength,
        blockCount: blockCount,
        blocks: blocks
    };
}

// Create CoE V2 Packet
function createCoEV2Packet(canNode, outputs) {
    // Outputs: Array von {outputNumber, unitId, value}
    // Max 16 value blocks
    const blockCount = Math.min(outputs.length, 16);
    const messageLength = 4 + (blockCount * 8);
    
    const buffer = Buffer.alloc(messageLength);
    
    // Write header
    buffer.writeUInt8(0x02, 0);  // Version Low
    buffer.writeUInt8(0x00, 1);  // Version High
    buffer.writeUInt8(messageLength, 2);  // Message Length
    buffer.writeUInt8(blockCount, 3);  // Block Count
    
    // Write value blocks
    for (let i = 0; i < blockCount; i++) {
        const offset = 4 + (i * 8);
        const output = outputs[i];
        
        buffer.writeUInt8(canNode, offset);  // CAN Node
        
        // Output Number (Little Endian, 2 Bytes)
        buffer.writeUInt8(output.outputNumber & 0xFF, offset + 1);
        buffer.writeUInt8((output.outputNumber >> 8) & 0xFF, offset + 2);
        
        buffer.writeUInt8(output.unitId || 0, offset + 3);  // Unit ID
        buffer.writeInt32LE(output.value, offset + 4);  // Value (Int32 LE)
    }
    
    return buffer;
}

// Convert V2 Data into V1 (for compatibility)
function convertV2ToLegacyFormat(v2Data) {
    // Group Outputs by block
    const blockMap = {};
    
    v2Data.blocks.forEach(block => {
        const isDigital = block.outputNumber <= 254;
        const actualOutput = isDigital ? block.outputNumber : (block.outputNumber - 255);
        
        // Determine block number and position
        let blockNumber, position;
        
        if (isDigital) {
            // Digital: Output 1-16 → Block 0, Output 17-32 → Block 9
            if (actualOutput <= 16) {
                blockNumber = 0;
                position = actualOutput - 1;
            } else {
                blockNumber = 9;
                position = actualOutput - 17;
            }
        } else {
            // Analog: Output 1-4 → Block 1, 5-8 → Block 2, etc.
            blockNumber = Math.floor((actualOutput - 1) / 4) + 1;
            position = (actualOutput - 1) % 4;
        }
        
        const key = `${block.canNode}-${blockNumber}`;
        
        if (!blockMap[key]) {
            blockMap[key] = {
                nodeNumber: block.canNode,
                blockNumber: blockNumber,
                dataType: isDigital ? 'digital' : 'analog',
                values: isDigital ? new Array(16).fill(undefined) : new Array(4).fill(undefined),
                units: isDigital ? null : new Array(4).fill(undefined)
            };
        }
        
        // Convert value & insert (V2 uses other decimals)
        const convertedValue = convertCoEToValue(block.value, block.unitId, 2);
        blockMap[key].values[position] = isDigital ? (block.value ? 1 : 0) : convertedValue;
        
        if (!isDigital && blockMap[key].units) {
            blockMap[key].units[position] = block.unitId;
        }
    });
    
    return Object.values(blockMap);
}

// Convert V1 Format to V2 Outputs
function convertLegacyToV2Format(nodeNumber, blockNumber, values, units, dataType) {
    const outputs = [];
    
    if (dataType === 'digital') {
        // Digital: 16 Bits
        const baseOutput = blockNumber === 0 ? 1 : 17;
        for (let i = 0; i < values.length; i++) {
            if (values[i] !== undefined) {
                outputs.push({
                    outputNumber: baseOutput + i,
                    unitId: 0,
                    value: values[i] ? 1 : 0
                });
            }
        }
    } else {
        // Analog: 4 Values
        const baseOutput = (blockNumber - 1) * 4 + 1;
        for (let i = 0; i < 4; i++) {
            if (values[i] !== undefined) {
                const unitId = units ? units[i] : 0;
                const rawValue = convertValueToCoE(values[i], unitId, 2); // V2 uses other decimals
                
                // Output > 255 = analog
                const outputNumber = baseOutput + i + 255;
                
                outputs.push({
                    outputNumber: outputNumber,
                    unitId: unitId,
                    value: rawValue
                });
            }
        }
    }
    
    return outputs;
}

module.exports = {
    parseCoEV2Packet,
    createCoEV2Packet,
    convertV2ToLegacyFormat,
    convertLegacyToV2Format
};