import { render, screen } from "@testing-library/react";
import HomePage from "../../app/page";

describe("HomePage", () => {
  it("renders the translator workspace shell", () => {
    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /TaiwanHolic 翻譯小秘書/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/上傳文章/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /分析文章/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/加入 Google Trend 旅遊關鍵字/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/選關鍵字/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/日文結果/i),
    ).not.toBeInTheDocument();
  });
});
