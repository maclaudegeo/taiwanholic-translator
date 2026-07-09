import { fireEvent, render, screen } from "@testing-library/react";
import { NotesPane } from "../../components/notes-pane";

describe("NotesPane", () => {
  it("lets the user toggle article and trend keywords by clicking the card", () => {
    const onToggleKeyword = vi.fn();

    render(
      <NotesPane
        blocks={[
          {
            id: "title-1",
            type: "title",
            sourceText: "寧夏夜市推薦",
            translatedText: null,
            polishedText: null,
            trendSuggestions: [],
            notes: []
          }
        ]}
        isPending={false}
        keywords={[
          {
            phrase: "寧夏夜市 グルメ",
            phraseZh: "寧夏夜市美食",
            source: "article_core",
            reason: "文章核心詞",
            selected: true
          },
          {
            phrase: "台北グルメ",
            phraseZh: "台北美食",
            source: "google_trends",
            reason: "趨勢詞",
            selected: false
          }
        ]}
        onAddManualKeyword={() => {}}
        onTranslate={() => {}}
        onToggleKeyword={onToggleKeyword}
      />
    );

    const articleKeyword = screen
      .getByText("寧夏夜市 グルメ")
      .closest("label")
      ?.querySelector('input[type="checkbox"]');
    const trendKeyword = screen
      .getByText("台北グルメ")
      .closest("label")
      ?.querySelector('input[type="checkbox"]');

    if (!(articleKeyword instanceof HTMLInputElement) || !(trendKeyword instanceof HTMLInputElement)) {
      throw new Error("Keyword checkboxes not found");
    }

    fireEvent.click(articleKeyword);
    fireEvent.click(trendKeyword);

    expect(screen.getByText(/中文意思：寧夏夜市美食/i)).toBeInTheDocument();
    expect(screen.getByText(/中文意思：台北美食/i)).toBeInTheDocument();
    expect(onToggleKeyword).toHaveBeenNthCalledWith(1, "寧夏夜市 グルメ", false);
    expect(onToggleKeyword).toHaveBeenNthCalledWith(2, "台北グルメ", true);
  });
});
