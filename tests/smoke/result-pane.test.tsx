import { render, screen } from "@testing-library/react";
import { ResultPane } from "../../components/result-pane";

describe("ResultPane", () => {
  it("renders title choices and a custom title input", () => {
    render(
      <ResultPane
        blocks={[
          {
            id: "title-1",
            type: "title",
            sourceText: "台北早餐推薦",
            translatedText: "台北の朝ごはん案内",
            polishedText: "台湾 朝ごはんを楽しむ台北案内",
            trendSuggestions: ["台湾 朝ごはん"],
            notes: []
          }
        ]}
        onDownload={() => {}}
        onTitleChange={() => {}}
        keywords={[
          {
            phrase: "台湾 朝ごはん",
            source: "google_trends",
            reason: "Recent Japan travel search phrase",
            selected: true
          }
        ]}
        titleOptions={[
          {
            id: "stable",
            label: "穩健型",
            text: "台北で楽しむ朝ごはん案内",
            focus: "穩健型",
            keywordsUsed: ["台湾 朝ごはん"]
          },
          {
            id: "click",
            label: "吸引型",
            text: "台湾らしい朝を楽しむなら 台北朝ごはん案内",
            focus: "吸引型",
            keywordsUsed: ["台湾 朝ごはん"]
          },
          {
            id: "search",
            label: "搜尋型",
            text: "台北 朝ごはん おすすめ 台湾旅行で外せない一軒",
            focus: "搜尋型",
            keywordsUsed: ["台湾 朝ごはん"]
          }
        ]}
      />
    );

    expect(screen.getByText(/標題建議/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/選這個標題/i)).toHaveLength(3);
    expect(screen.getByLabelText(/使用自訂標題/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/自己輸入想用的日文標題/i)).toBeInTheDocument();
  });
});
