const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment"); // 日付のフォーマットに便利なライブラリ
const cors = require("cors"); // CORSミドルウェア

const app = express();
const PORT = process.env.PORT || 3000;

// 許可するドメインのリスト
const allowedOrigins = [
  /^https:\/\/.*\.kits-tools\.net$/,
  /^https:\/\/.*\.kokecoco\.me$/,
];

// CORS設定をカスタム
app.use(
  cors({
    origin: (origin, callback) => {
      // originが許可されたドメインとマッチするか確認
      if (!origin || allowedOrigins.some((pattern) => pattern.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
  }),
);

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

    // メタタグやHTML内の情報から作成日を取得する
    let creationDate =
      $('meta[name="date"]').attr("content") ||
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="publish_date"]').attr("content") ||
      $('meta[itemprop="datePublished"]').attr("content") ||
      $("time").attr("datetime") ||
      $(".entry-date.date.published").text() ||
      $(".post-date .entry-date").text() ||
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
      /(?:\s*[\|\｜\-–—－—　\/]+\s*)/g, // 半角パイプ(｜)、全角パイプ(｜)、ハイフン、エンダッシュ、エムダッシュ、全角ハイフン、全角スペースに対応
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
      title: title || null,
      subtitle: subtitle || null,
      author: author || null,
      creationDate: creationDate || null,
    });
  } catch (error) {
    console.error("Error fetching the URL:", error.message || error);
    res.status(500).json({
      error: "Failed to fetch data from the provided URL",
      details: error.message || null,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
