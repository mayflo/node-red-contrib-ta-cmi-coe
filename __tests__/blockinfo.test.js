const { getBlockInfo } = require("../lib/utils");

describe("Block Info Tests", () => {
  test("Analog Output 1 → Block 1, Position 0", () => {
    expect(getBlockInfo("analog", 0, 1)).toEqual({ number: 1, position: 0, key: "0-1-a" });
  });

  test("Analog Output 5 → Block 2, Position 0", () => {
    expect(getBlockInfo("analog", 1, 5)).toEqual({ number: 2, position: 0, key: "1-2-a"  });
  });

  test("Digital Output 10 → Block 0, Position 9", () => {
    expect(getBlockInfo("digital", 5, 10)).toEqual({ number: 0, position: 9, key: "5-0-d"  });
  });

  test("Digital Output 20 → Block 9, Position 3", () => {
    expect(getBlockInfo("digital", 1, 20)).toEqual({ number: 9, position: 3, key: "1-9-d"  });
  });

  test("Ungültiger Output → Default", () => {
    expect(getBlockInfo("analog", 11, 0)).toEqual({ number: 1, position: 0, key: "11-1-a"  });
  });
});

