const { getBlockInfo } = require("../lib/utils");

describe("Block Info Tests", () => {
  test("Analog Output 1 → Block 1, Position 0", () => {
    expect(getBlockInfo("analog", 1)).toEqual({ block: 1, position: 0 });
  });

  test("Analog Output 5 → Block 2, Position 0", () => {
    expect(getBlockInfo("analog", 5)).toEqual({ block: 2, position: 0 });
  });

  test("Digital Output 10 → Block 0, Position 9", () => {
    expect(getBlockInfo("digital", 10)).toEqual({ block: 0, position: 9 });
  });

  test("Digital Output 20 → Block 9, Position 3", () => {
    expect(getBlockInfo("digital", 20)).toEqual({ block: 9, position: 3 });
  });

  test("Ungültiger Output → Default", () => {
    expect(getBlockInfo("analog", 0)).toEqual({ block: 1, position: 0 });
  });
});

