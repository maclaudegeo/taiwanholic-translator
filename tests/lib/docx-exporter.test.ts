import { buildDocxBuffer } from "../../lib/docx-exporter";
import { sampleBlocks } from "../fixtures/sample-article";

describe("buildDocxBuffer", () => {
  it("creates a docx buffer from polished article blocks", async () => {
    const buffer = await buildDocxBuffer(sampleBlocks);

    expect(buffer.byteLength).toBeGreaterThan(0);
  });

  it("creates a docx buffer with a title override", async () => {
    const buffer = await buildDocxBuffer(sampleBlocks, "自訂標題");

    expect(buffer.byteLength).toBeGreaterThan(0);
  });
});
