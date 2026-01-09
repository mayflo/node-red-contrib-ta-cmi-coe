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
    const outputCount = buffer.readUInt8(3);
    
    if (versionLow !== 0x02 || versionHigh !== 0x00) { // Validate version
        console.warn(`Invalid version: ${versionLow}.${versionHigh} (v2)`);
        return null;
    }
    
    const expectedLength = 4 + (outputCount * 8);
    if (buffer.length !== expectedLength) {
        console.warn(`Received CoE packet with incorrect length. Expected: ${expectedLength}, Received: ${buffer.length} (v2)`);
        return null;
    }
    
    // Parse value blocks
    const valueBlocks = [];
    for (let i = 0; i < outputCount; i++) {
        const offset = 4 + (i * 8);
        const nodeNumber = buffer.readUInt8(offset);
        const outputNumber = buffer.readUInt8(offset + 1) + 1;
        const dataType = buffer.readUInt8(offset + 2);
        const unitId = buffer.readUInt8(offset + 3);
        const value = buffer.readInt32LE(offset + 4);
        const convertedValue = convertRawToValue(value, unitId, 2); // V2 decimals
        
        valueBlocks.push({
            nodeNumber: nodeNumber,
            outputNumber: outputNumber,
            dataType: dataType,
            unitId: unitId,
            value: convertedValue
        });
    }
    
    const messageData = {
        version: 2,
        messageLength: messageLength,
        blockCount: outputCount,
        outputs: valueBlocks
    };

    // Convert to uniform format for further processing
    return convertV2ToUniformFormat(messageData);
}

// Convert V2 Data into Uniform format
function convertV2ToUniformFormat(messageData) {

    // Grouping outputs by nodeNumber & dataType
    const outputGroup = [];
    
    messageData.outputs.forEach(valueBlock => {
        const groupkey = `${valueBlock.nodeNumber}-${valueBlock.dataType}`;
        
        if (!outputGroup[groupkey]) {
            outputGroup[groupkey] = {
                nodeNumber: valueBlock.nodeNumber,
                dataType: valueBlock.dataType ? 'analog' : 'digital',
                outputs: {}
            };
        }

        outputGroup[groupkey].outputs[valueBlock.outputNumber] = {
            value: valueBlock.dataType ? valueBlock.value : (valueBlock.value ? 1 : 0),
            unit: valueBlock.unitId
        };
    });
    return Object.values(outputGroup);
}

// Create CoE V2 Packet
function createPacket(nodeNumber, dataType, outputs) {
    // outputState: Array von {outputNumber, unit, value}
    // Max 16 value blocks
    const outputState = convertUniformToV2Format(dataType, outputs);
    
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
        const isAnalog = (dataType === 'analog');
        
        const rawNumber = output.outputNumber - 1 || 0;
        const rawValue = convertValueToRaw(output.value, output.unitId, 2); // V2 decimals
        
        buffer.writeUInt8(nodeNumber, offset);
        
        buffer.writeUInt8(rawNumber, offset + 1);
        buffer.writeUInt8((isAnalog), offset + 2);
        
        buffer.writeUInt8(output.unitId || 0, offset + 3);  // Unit ID
        buffer.writeInt32LE(rawValue, offset + 4);  // Value (Int32 LE)
    }
    return buffer;
}

// Convert Uniform format to V2 outputs
function convertUniformToV2Format(dataType, outputs) {
    const outputState = [];
    const isDigital = (dataType === 'digital');

    Object.entries(outputs).forEach(([outputKey, output]) => {
        
        if (output.value !== undefined) {  
            outputState.push({
                outputNumber: parseInt(outputKey),
                value: isDigital? (output.value ? 1 : 0) : output.value,
                unitId: output ? output.unit : 0
            });
        }
    });
    return outputState;
}

module.exports = {
    parsePacket,
    createPacket
};