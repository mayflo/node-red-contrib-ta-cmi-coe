const { convertRawToValue, convertValueToRaw, getUnitInfo } = require("../lib/utils");

describe("CoE Conversion Utilities", () => {
  test("°C mit Unit=1, decimals=1", () => {
    const unitInfo = { decimals: 1 };
    expect(convertRawToValue(225, 1, 1)).toBe(22.5);
    expect(convertValueToRaw(22.5, 1, 1)).toBe(225);
  });

  test("kW mit Unit=10, Protocol V2 override", () => {
    // V2 überschreibt decimals=2
    expect(convertRawToValue(2500, 10, 2)).toBe(25.0);
    expect(convertValueToRaw(25.0, 10, 2)).toBe(2500);
  });

  test("Unknown Unit", () => {
    const info = getUnitInfo(999, "de");
    expect(info.name).toMatch(/Unknown/);
    expect(convertRawToValue(1234, 999, 1)).toBe(1234); // decimals=0
  });
});

