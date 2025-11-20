/**
 * Units Config Module for CoE Nodes
 */ 

module.exports = function(RED) {
  const { unitsRaw } = require("../lib/units");

  // Admin-API-Endpunkt
  RED.httpAdmin.get("/ta-cmi-coe/units", function(req, res) {
    const result = {};
    for (const [id, def] of Object.entries(unitsRaw)) {
      const name = RED._(`${def.key}.name`);
      const symbol = RED._(`${def.key}.symbol`);

      result[id] = {
        name: name || def.key,
        symbol: symbol || "",
        decimals: def.decimals
      };
    }
    res.json(result);
  });

  // Optional: als Config-Node registrieren
  function UnitsConfigNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    node.on("input", function(msg) {
      const result = {};
      for (const [id, def] of Object.entries(unitsRaw)) {
        const name = RED._(`${def.key}.name`);
        const symbol = RED._(`${def.key}.symbol`);

        result[id] = {
          name: name || def.key,
          symbol: symbol || "",
          decimals: def.decimals
        };
      }
      msg.units = result;
      node.send(msg);
    });
  }

  RED.nodes.registerType("units-config", UnitsConfigNode);
};