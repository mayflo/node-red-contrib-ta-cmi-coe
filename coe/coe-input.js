// CoE Input Node 

module.exports = function(RED) {
    'use strict';
    const { getBlockInfo, getUnitInfo } = require('../lib/utils')

    // CoE Input Node (Empfangen von Werten)
    function CoEInputNode(config) {
        RED.nodes.createNode(this, config);
        const node = this;
        
        node.cmiConfig = RED.nodes.getNode(config.cmiconfig);
        
        if (!node.cmiConfig) {
            node.error("CMI Configuration missing");
            return;
        }
        
        node.cmiAddress = node.cmiConfig.address;
        node.nodeNumber = parseInt(config.nodeNumber) || 0;
        node.outputNumber = parseInt(config.outputNumber) || 1;
        node.dataType = config.dataType || 'analog';
        // receiveAll wurde entfernt

        // Berechne Block und Position
        const blockInfo = getBlockInfo(node.dataType, node.outputNumber);
        
        // Listener für eingehende Daten
        const listener = (data) => {
            
            // Filter: Knoten-Nummer (wenn > 0)
            if (node.nodeNumber > 0 && data.nodeNumber !== node.nodeNumber) {
                return;
            }
            
            // Filter: Block-Nummer
            if (data.blockNumber !== blockInfo.block) {
                return;
            }
            
            // Wert extrahieren
            let value, unit;
            if (node.dataType === 'analog') {
                value = data.values[blockInfo.position];
                unit = data.units ? data.units[blockInfo.position] : null;
            } else {
                value = data.values[blockInfo.position] ? true : false;
                unit = null;
            }
            
            // Nachricht erstellen
            const unitInfo = getUnitInfo(unit);
            const msg = {
                payload: value,
                topic: `coe/${node.nodeNumber || data.nodeNumber}/${node.dataType}/${node.outputNumber}`,
                coe: {
                    nodeNumber: data.nodeNumber,
                    blockNumber: data.blockNumber,
                    outputNumber: node.outputNumber,
                    dataType: node.dataType,
                    version: data.version,
                    unit: unit,
                    unitName: unitInfo.name,
                    unitSymbol: unitInfo.symbol,
                    sourceIP: data.sourceIP,
                    raw: data
                }
            };
            
            node.send(msg);
            node.status({
                fill:"green", 
                shape:"dot", 
                text:`${value} ${unitInfo.symbol || ''} [v${data.version}]`
            });
        };

        node.cmiConfig.registerListener(listener);
        
        // Status mit Info ob Node Number gefiltert wird
        if (node.nodeNumber === 0) {
            node.status({fill:"yellow", shape:"ring", text:"waiting (any node)"});
        } else {
            node.status({fill:"grey", shape:"ring", text:"waiting"});
        }

        node.on('close', function() {
            node.cmiConfig.unregisterListener(listener);
        });
    }
    RED.nodes.registerType("coe-input", CoEInputNode);
};