const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/api/get-info", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // ページのタイトルを取得
    let title = $("title").text();
    // メタタグのauthorを取得
    let author = $('meta[name="author"]').attr("content") || "手動";

    // 区切り文字のリスト（全角・半角パイプ、ハイフン、ダッシュ、全角ハイフン、全角スペース）
    const delimiters = [
      /(?:\s*[\|\｜\-–—－—　]+\s*)/g, // 半角パイプ(｜)、全角パイプ(｜)、ハイフン、エンダッシュ、エムダッシュ、全角ハイフン、全角スペースに対応
    ];

    // 各区切り文字で分割する
    let subtitle = "";
    for (const delimiter of delimiters) {
      const parts = title.split(delimiter);
      if (parts.length > 1) {
        title = parts[0].trim();
        subtitle = parts.slice(1).join(" ").trim();
        break;
      }
    }

    // 結果を返す
    res.json({
      title: title || "タイトルなし",
      subtitle: subtitle || "サブタイトルなし",
      author: author,
      creationDate: new Date().toISOString().split("T")[0], // 現在の日付をISO形式で取得
    });
  } catch (error) {
    console.error("Error fetching the URL:", error);
    res.status(500).json({
      title: "タイトルなし",
      subtitle: "サブタイトルなし",
      author: "手動",
      creationDate: new Date().toISOString().split("T")[0],
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
