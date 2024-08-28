const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment"); // 日付のフォーマットに便利なライブラリ

const app = express();
const PORT = process.env.PORT || 3000;

// Moment.jsで日付フォーマットを統一
const formatDate = (dateString) => {
  if (!dateString) return null;
  const date = moment(new Date(dateString));
  return date.isValid() ? date.format("YYYY-MM-DD") : null;
};

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

    // メタタグやHTML内の情報から作成日を取得する（WordPressテーマの対応を含む）
    let creationDate =
      $('meta[name="date"]').attr("content") ||
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="publish_date"]').attr("content") ||
      $('meta[itemprop="datePublished"]').attr("content") ||
      $("time").attr("datetime") ||
      $(".entry-date.date.published").text() || // WordPressのテーマでよく見られるパターン
      $(".post-date .entry-date").text() || // 例: 独自のテーマが使用されている場合
      ""; // 存在しない場合はnull

    // 日付をフォーマットして統一
    creationDate = formatDate(creationDate);

    // メタタグやHTML内の情報から作者を取得する
    let author =
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      $('meta[itemprop="author"]').attr("content") ||
      $(".author").text() ||
      $(".post-author").text() ||
      $('a[rel="author"]').text() ||
      ""; // 存在しない場合はnull

    author = author.trim();

    // 区切り文字のリスト（全角・半角パイプ、ハイフン、ダッシュ、全角ハイフン、全角スペース）
    const delimiters = [
      /(?:\s*[\|\｜\-–—－—　]+\s*)/g, // 半角パイプ(｜)、全角パイプ(｜)、ハイフン、エンダッシュ、エムダッシュ、全角ハイフン、全角スペースに対応
    ];

    // タイトルを区切り文字で分割する
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
      author: author || "作者情報なし",
      creationDate: creationDate || "作成日情報なし",
    });
  } catch (error) {
    console.error("Error fetching the URL:", error);
    res.status(500).json({
      title: "タイトルなし",
      subtitle: "サブタイトルなし",
      author: null,
      creationDate: null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
