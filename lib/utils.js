/**
 * CoE Utilities Module (used internally by nodes)
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const UNITS = require ('./units.js');

// Utilities for unit conversion
function convertCoEToValue(rawValue, unitId, protocolVersion) {
    const unitDecimals = getUnitDecimals(unitId, protocolVersion);
    return rawValue / Math.pow(10, unitDecimals);
}

function convertValueToCoE(value, unitId, protocolVersion) {
    const unitDecimals = getUnitDecimals(unitId, protocolVersion);
    return Math.round(value * Math.pow(10, unitDecimals));
}

// Retrieves unit name, symbol from unit list
function getUnitInfo(unitId, langCode) {
    const useGerman = (getUnitLanguage(langCode) === "de");
    const idKey = String(unitId);

    // Use UNITS from units.js as base
    if (UNITS && UNITS[idKey]) { 
        const unit = UNITS[idKey];
        return {
            name: useGerman ? unit.name_de : unit.name_en,
            symbol: useGerman ? unit.symb_de : unit.symb_en
        };
    } else {
        return {
            name: `Unknown (${idKey})`,
            symbol: ''
        };
    }
}

// Retrieve unit decimals from unit list
function getUnitDecimals(unitId, protocolVersion) {
    let unitDecimals;
    const unitKey = String(unitId); 
    
    if (UNITS && UNITS[unitKey]) {
        unitDecimals = UNITS[unitKey].decimals;
    } else {
        unitDecimals = 0;
    }
    
    // V2 specific overrides
    if (protocolVersion === 2) {
        const v2_Overrides = {
            10: { decimals: 2 }  // Power kW: V1=1, V2=2 decimals
            // Add more overrides if needed
        };
        
        if (v2_Overrides[unitId]) {
            unitDecimals = v2_Overrides[unitId].decimals;
        }
    }
    return unitDecimals;
}

// Determine unit language code
function getUnitLanguage(lang) {
    if (lang.toLowerCase().startsWith("de")) {
        return "de";
    }
    return "en";
}

// Translate output number to block position (CoE V1)
function getBlockInfo(dataType, nodeNumber, outputNumber) {
    let blockNumber, position, dType;
    nodeNumber = parseInt(nodeNumber) || 0;
    outputNumber = parseInt(outputNumber);

    if (isNaN(outputNumber) || outputNumber < 1) { // Default to block 1 position 0
        blockNumber = 1;
        position = 0;
        dType = 'a';
    }

    if (dataType === 'analog') {
        // Analog: Outputs 1..32 → Blocks 1..8 (4 Outputs each)
        blockNumber = Math.floor((outputNumber - 1) / 4) + 1; // 1..8
        position = (outputNumber - 1) % 4; // 0..3
        dType = 'a';
    } else {
        dType = 'd';
        // Digital: Outputs 1..16 → Block 0, 17..32 → Block 9
        if (outputNumber <= 16) {
            blockNumber = 0;
            position = outputNumber - 1; // 0..1
        } else {
            blockNumber = 9;
            position = outputNumber - 17; // 0..15
        }
    }
    const key = `${nodeNumber}-${blockNumber}-${dType}`;
    return { number: blockNumber, position: position, key: key };
}

// Merge incoming (V2) block data with LKGV (Last Known Good Values)
function mergeBlockData(currentState, newBlock) {
    const isDigital = newBlock.dataType === 'digital' || newBlock.blockNumber === 0 || newBlock.blockNumber === 9;
    const numValues = isDigital ? 16 : 4;
    
    const updatedBlock = { // Initialize the updated block (copy)
        ...currentState,
        values: new Array(numValues).fill(undefined),
        units: isDigital ? null : new Array(numValues).fill(undefined)
    };

    const oldValues = currentState.values || [];
    const oldUnits = currentState.units || [];

    for (let i = 0; i < numValues; i++) { // Copy the old LKGV (Last Known Good Values)
        if (oldValues[i] !== undefined) {
                updatedBlock.values[i] = oldValues[i];
        }
    }

    if (!isDigital && updatedBlock.units && oldUnits) { // Copy old units
        for (let i = 0; i < 4; i++) {
            if (oldUnits[i] !== undefined) {
                updatedBlock.units[i] = oldUnits[i];
            }
        }
    }

    for (let i = 0; i < numValues; i++) { // Merge with the new (sparse V2) values
        if (newBlock.values && newBlock.values[i] !== undefined) {
            updatedBlock.values[i] = newBlock.values[i];
        }
    }

    if (!isDigital && updatedBlock.units && newBlock.units) { // Merge the new units (only analog)
        for (let i = 0; i < 4; i++) {
            if (newBlock.units[i] !== undefined) {
                updatedBlock.units[i] = newBlock.units[i];
            }
        }
    }

    return updatedBlock;
}

// Create empty block state (incoming block)
function createEmptyState(incomingBlock) {
    const isDigital = incomingBlock.dataType === 'digital' || incomingBlock.blockNumber === 0 || incomingBlock.blockNumber === 9;
    const numValues = isDigital ? 16 : 4;
    return {
        nodeNumber: incomingBlock.nodeNumber,
        blockNumber: incomingBlock.blockNumber,
        dataType: isDigital ? 'digital' : 'analog',
        values: new Array(numValues).fill(undefined),
        units: isDigital ? null : new Array(numValues).fill(undefined),
    };
}

module.exports = {
    convertCoEToValue,
    convertValueToCoE,
    getUnitInfo,
    getBlockInfo,
    mergeBlockData,
    createEmptyState
};