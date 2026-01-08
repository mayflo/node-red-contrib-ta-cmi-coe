const { getBlockInfo } = require("../lib/utils");

describe("Block Info Tests", () => {
  test("Analog Output 1 → Block 1, Position 0 (V1)", () => {
    expect(getBlockInfo("analog", 0, 1)).toEqual({ number: 1, position: 0 });
  });

  test("Analog Output 5 → Block 2, Position 0 (V1)", () => {
    expect(getBlockInfo("analog", 5)).toEqual({ number: 2, position: 0 });
  });

  test("Digital Output 10 → Block 0, Position 9 (V1)", () => {
    expect(getBlockInfo("digital", 10)).toEqual({ number: 0, position: 9 });
  });

  test("Digital Output 20 → Block 9, Position 3 (V1)", () => {
    expect(getBlockInfo("digital", 20)).toEqual({ number: 9, position: 3 });
  });

  test("Ungültiger Output → Default (V1)", () => {
    expect(getBlockInfo("analog", 0)).toEqual({ number: 1, position: 0 });
  });

});

