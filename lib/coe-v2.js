/**
 * CoE V2 Protocol Support Module
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const { convertRawToValue, convertValueToRaw } = require('./utils');

// CoE V2 Parse message from buffer
function parsePacket(buffer) {

    if (buffer.length < 4) {
        console.warn(`Received CoE packet with incorrect length. Expected min. 4, received: ${buffer.length} (v2)`);
        return null;
    }
    
    // Parse header
    const versionLow = buffer.readUInt8(0);
    const versionHigh = buffer.readUInt8(1);
    const messageLength = buffer.readUInt8(2);
    const blockCount = buffer.readUInt8(3);
    
    if (versionLow !== 0x02 || versionHigh !== 0x00) { // Validate version
        console.warn(`Invalid version: ${versionLow}.${versionHigh} (v2)`);
        return null;
    }
    
    const expectedLength = 4 + (blockCount * 8);
    if (buffer.length !== expectedLength) {
        console.warn(`Received CoE packet with incorrect length. Expected: ${expectedLength}, Received: ${buffer.length} (v2)`);
        return null;
    }
    
    // Parse value blocks
    const blocks = [];
    for (let i = 0; i < blockCount; i++) {
        const offset = 4 + (i * 8);
        const nodeNumber = buffer.readUInt8(offset);
        const outputNumber = buffer.readUInt16LE(offset + 1);
        const unitId = buffer.readUInt8(offset + 3);
        const value = buffer.readInt32LE(offset + 4);
        
        blocks.push({
            nodeNumber: nodeNumber,
            outputNumber: outputNumber,
            unitId: unitId,
            value: value,
            isDigital: outputNumber <= 254,
            isAnalog: outputNumber > 254
        });
    }
    
    const v2Data = {
        version: 2,
        messageLength: messageLength,
        blockCount: blockCount,
        blocks: blocks
    };

    // Convert to legacy format for further processing
    return convertV2ToUniformFormat(v2Data);
}

// Convert V2 Data into Uniform format
function convertV2ToUniformFormat(v2Data) {
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
        
        const key = `${block.nodeNumber}-${blockNumber}`;
        
        if (!blockMap[key]) {
            blockMap[key] = {
                nodeNumber: block.nodeNumber,
                blockNumber: blockNumber,
                dataType: isDigital ? 'digital' : 'analog',
                values: isDigital ? new Array(16).fill(undefined) : new Array(4).fill(undefined),
                units: isDigital ? new Array(16).fill(undefined) : new Array(4).fill(undefined)
            };
        }
        
        // Convert value & insert (V2 uses other decimals)
        const convertedValue = convertRawToValue(block.value, block.unitId, 2);
        blockMap[key].values[position] = isDigital ? (block.value ? 1 : 0) : convertedValue;
        
        if (blockMap[key].units) {
            blockMap[key].units[position] = block.unitId;
        }
    });
    return Object.values(blockMap);
}

// Create CoE V2 Packet
function createPacket(nodeNumber, blockNumber, values, units, dataType) {
    // outputState: Array von {outputNumber, unitId, value}
    // Max 16 value blocks
    const outputState = convertUniformToV2Format(blockNumber, values, units, dataType);
    
    const blockCount = Math.min(outputState.length, 16);
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
        const output = outputState[i];
        
        buffer.writeUInt8(nodeNumber, offset);
        
        // Output Number (Little Endian, 2 Bytes)
        buffer.writeUInt8(output.outputNumber & 0xFF, offset + 1);
        buffer.writeUInt8((output.outputNumber >> 8) & 0xFF, offset + 2);
        
        buffer.writeUInt8(output.unitId || 0, offset + 3);  // Unit ID
        buffer.writeInt32LE(output.value, offset + 4);  // Value (Int32 LE)
    }
    return buffer;
}

// Convert Uniform format to V2 outputs
function convertUniformToV2Format(blockNumber, values, units, dataType) {
    const outputs = [];
    
    if (dataType === 'digital') {
        // Digital: 16 Bits
        const baseOutput = blockNumber === 0 ? 1 : 17;
        for (let i = 0; i < values.length; i++) {
            if (values[i] !== undefined) {
                const unitId = units && units[i] !== undefined ? units[i] : 0;

                outputs.push({
                    outputNumber: baseOutput + i,
                    unitId: unitId,
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
                const rawValue = convertValueToRaw(values[i], unitId, 2); // V2 uses other decimals
                
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
    parsePacket,
    createPacket
};