/**
 * CoE Protocol Parsing and Creation Module
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = {
    // Parsing functions for CoE V1 and V2
    createPacket: {
        1: require('./coe-v1.js').createPacket,
        2: require('./coe-v2.js').createPacket
    },
    parsePacket: {
        1: require('./coe-v1.js').parsePacket,
        2: require('./coe-v2.js').parsePacket
    }
};