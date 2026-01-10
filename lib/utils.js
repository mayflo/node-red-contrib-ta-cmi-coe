/**
 * CoE Utilities Module (used internally by nodes)
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

const UNITS = require ('./units.js');

// CAN Node, Output & Type validator
const Validate = {
    node: function(value, allowZero) {
        const min = allowZero ? 0 : 1;
        const max = 62;
        const num = parseInt(value, 10) || min;
        return Math.min(Math.max(num, min), max);
    },

    output: function(value, version) {
        const max = (version === 2 || version === "2") ? 64 : 32;
        const num = parseInt(value, 10) || 1;
        return Math.min(Math.max(num, 1), max);
    },

    types: {
        "analog":  { long: "analog",  short: "A", isDigital: false },
        "digital": { long: "digital", short: "D", isDigital: true  },
        "all":     { long: "all",     short: "", isDigital: null }
    },

    // Return a type object
    type: function(input) {
        return this.types[input] || this.types["analog"];
    }
};

// Utilities for unit conversion
function convertRawToValue(rawValue, unitId, coeVersion) {
    const unitDecimals = getUnitDecimals(unitId, coeVersion);
    return rawValue / Math.pow(10, unitDecimals);
}

function convertValueToRaw(value, unitId, coeVersion) {
    const unitDecimals = getUnitDecimals(unitId, coeVersion);
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
            symbol: unit.digital ? '' : (useGerman ? unit.symb_de : unit.symb_en) // No symbol for digital types
        };
    } else {
        return {
            name: `Unknown (${idKey})`,
            symbol: ''
        };
    }
}

// Generate digital state key based on unit and value
function getDigitalStateKey(unit, value, prefix = "coe.status.") {
    const states = {
        43: value ? "on" : "off",
        44: value ? "yes" : "no",
        78: value ? "open" : "closed",
        default: value ? "on" : "off"
    };

    const state = states[unit] || states.default;
    return `${prefix}${state}`;
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
function getBlockInfo(dataType, outputNumber) {
    let blockNumber, position;
    outputNumber = parseInt(outputNumber);

    if (isNaN(outputNumber) || outputNumber < 1) { // Default to block 1 position 0
        blockNumber = 1;
        position = 0;
    } else {
        if (dataType === 'analog') {
            // Analog: Outputs 1..32 → Blocks 1..8 (4 Outputs each)
            blockNumber = Math.floor((outputNumber - 1) / 4) + 1; // 1..8
            position = (outputNumber - 1) % 4; // 0..3
        } else {
            // Digital: Outputs 1..16 → Block 0, 17..32 → Block 9
            if (outputNumber <= 16) {
                blockNumber = 0;
                position = outputNumber - 1; // 0..1
            } else {
                blockNumber = 9;
                position = outputNumber - 17; // 0..15
            }
        }
    }
    return { number: blockNumber, position: position};
}

// Translate block number to output arrays (CoE V1)
function getOutputsfromBlock(blockNumber, dataType) { 
    let start, length;
    if (dataType === 'analog') {
        length = 4;
        start = ((blockNumber - 1) * 4) + 1;
    }
    else { // digital
        length = 16;
        if (blockNumber === 0) {
            start = 1;
        } else { // block 9
            start = 17;
        }
    }
    return Array.from({ length }, (_, i) => start + i); 
}

// Merge incoming (V2) node data with LKGV (Last Known Good Values)
function mergeNodeData(currentState, newNode) {
    return { 
        ...currentState, 
        ...newNode, 
        outputs: { 
            ...currentState.outputs, 
            ...newNode.outputs 
        } 
    }; 
}

// Create empty block state (incoming block)
function createEmptyState(incomingBlock) {
    const isDigital = incomingBlock.dataType === 'digital';

    return {
        nodeNumber: incomingBlock.nodeNumber,
        dataType: isDigital ? 'digital' : 'analog',
        outputs: {}
    };
}

module.exports = {
    Validate,
    convertRawToValue,
    convertValueToRaw,
    getUnitInfo,
    getDigitalStateKey,
    getBlockInfo,
    getOutputsfromBlock,
    mergeNodeData,
    createEmptyState
};