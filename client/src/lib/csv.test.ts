import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvLine } from "./csv";

describe("parseCsvLine", () => {
  it("splits a simple comma-separated line", () => {
    expect(parseCsvLine("a,b,c")).toEqual(["a", "b", "c"]);
  });

  it("keeps commas inside quoted fields intact", () => {
    expect(parseCsvLine('"Smith, Jones",b')).toEqual(["Smith, Jones", "b"]);
  });

  it("unescapes doubled quotes inside a quoted field", () => {
    expect(parseCsvLine('"She said ""hi""",b')).toEqual(['She said "hi"', "b"]);
  });

  it("trims whitespace around unquoted values", () => {
    expect(parseCsvLine(" a , b ")).toEqual(["a", "b"]);
  });
});

describe("parseCsv", () => {
  it("maps rows to header-keyed records", () => {
    const rows = parseCsv("name,city\nAcme Ltd,Dublin\nBeta Co,Cork");
    expect(rows).toEqual([
      { name: "Acme Ltd", city: "Dublin" },
      { name: "Beta Co", city: "Cork" },
    ]);
  });

  it("returns an empty array when there are no data rows", () => {
    expect(parseCsv("name,city")).toEqual([]);
    expect(parseCsv("")).toEqual([]);
  });

  it("fills missing trailing columns with an empty string", () => {
    const rows = parseCsv("name,city,country\nAcme Ltd,Dublin");
    expect(rows).toEqual([{ name: "Acme Ltd", city: "Dublin", country: "" }]);
  });

  it("handles CRLF line endings", () => {
    const rows = parseCsv("name,city\r\nAcme Ltd,Dublin\r\n");
    expect(rows).toEqual([{ name: "Acme Ltd", city: "Dublin" }]);
  });
});
