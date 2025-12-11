/**
 * API Endpoint for Units
 * 
 * Copyright 2025 Florian Mayrhofer
 * Licensed under the Apache License, Version 2.0
 *
 */ 

module.exports = function(RED) {
    
    const UNITS = require ('../lib/units.js');

    function UnitConfigNode(config) {
        RED.nodes.createNode(this, config);
    }
    
    RED.nodes.registerType("unit-config", UnitConfigNode);

    RED.httpAdmin.get('/ta-cmi-coe/units/:lang?', function(req, res) {
        const lang = req.params.lang && req.params.lang.toLowerCase().startsWith("de") ? "de" : "en";

        const localizedUnits = {};

        Object.keys(UNITS).forEach(key => {
            const unit = UNITS[key];
            localizedUnits[key] = {
                name: lang === "de" ? unit.name_de : unit.name_en,
                symb: lang === "de" ? unit.symb_de : unit.symb_en,
                decimals: unit.decimals,
                type: unit.type
            };
        });

        res.json(localizedUnits);
    });

};