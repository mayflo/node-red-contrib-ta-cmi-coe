/**
 * CoE V1 Protocol Support Module
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const { getOutputsfromBlock, getBlockInfo, convertRawToValue, convertValueToRaw } = require('./utils');

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
        // analog
        for (let i = 0; i < 4; i++) {
            const value = buffer.readInt16LE(2 + i * 2);
            const unitId = buffer.readUInt8(10 + i);
            
            const convertedValue = convertRawToValue(value, unitId, 1); // V1 decimals
            values.push(convertedValue);
            units.push(unitId);
        }
    }
    
    const valueBlock = {
        nodeNumber: nodeNumber,
        blockNumber: blockNumber,
        values: values,
        units: units
    };

    return convertV1ToUniformFormat(valueBlock);
}

// Convert V1 data into Uniform format
function convertV1ToUniformFormat(valueBlock) {
    const blockNumber = valueBlock.blockNumber;
    const dataType = (blockNumber === 0 || blockNumber === 9) ? 'digital' : 'analog';
    const outputNumbers = getOutputsfromBlock(blockNumber, dataType);
    
    // Create outputs object
    const outputs = {}; 
    
    for (let i = 0; i < outputNumbers.length; i++) { 
        const outputNumber = outputNumbers[i]; 

        outputs[outputNumber] = { 
            value: valueBlock.values[i], 
            unit: valueBlock.units[i] 
        }; 
    } 

    return [{ nodeNumber: valueBlock.nodeNumber, blockNumber, dataType, outputs }];
}

// Create CoE Packet from values
function createPacket(nodeNumber, dataType, outputs) {
    let buffer;
    const blockState = convertUniformToV1Format(dataType, outputs);
    const blockNumber = parseInt(Object.keys(blockState)[0], 10);
    const blockData = blockState[Object.keys(blockState)[0]];

    if (dataType === 'digital') {
        buffer = Buffer.alloc(14);
        buffer.writeUInt8(nodeNumber, 0);
        buffer.writeUInt8(blockNumber, 1);
       
        let bitField = 0;
        for (let i = 0; i < 16; i++) {
            if (blockData.values[i]) {
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
            const unitId = blockData.units ? blockData.units[i] : 0;
            const rawValue = convertValueToRaw(blockData.values[i], unitId, 1); // V1 Decimal places

            if (rawValue > 32767 || rawValue < -32768) {
                console.warn(`Value ${blockData.values[i]} exceeds V1 limits. Consider using V2.`);
            }
            
            buffer.writeInt16LE(Math.max(-32768, Math.min(32767, rawValue)), 2 + i * 2);
            buffer.writeUInt8(unitId, 10 + i);
        }
    }
    
    return buffer;
}

// Convert Uniform into V1 format
function convertUniformToV1Format(dataType, outputs) {
    // Group Outputs by block
    const blockState = {};
    
    Object.entries(outputs).forEach(([outputKey, output]) => {
        const isDigital = dataType === 'digital';
        const outputNumber = parseInt(outputKey);
        
        // Determine block number and position
        const block = getBlockInfo(dataType, outputNumber); 
        const blockKey = block.number;
        
        if (!blockState[blockKey]) {
            blockState[blockKey] = {
                values: isDigital ? new Array(16).fill(undefined) : new Array(4).fill(undefined),
                units: isDigital ? new Array(16).fill(undefined) : new Array(4).fill(undefined)
            };
        }
        
        // Convert value & insert
        blockState[blockKey].values[block.position] = isDigital ? (output.value ? 1 : 0) : output.value;
        
        if (blockState[blockKey].units) {
            blockState[blockKey].units[block.position] = output.unit;
        }
    });
    return blockState;
}

module.exports = { 
    parsePacket, 
    createPacket
};