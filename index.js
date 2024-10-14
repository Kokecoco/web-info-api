const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment"); // 日付のフォーマットに便利なライブラリ
require('moment/locale/ja'); // 日本語のロケールをロード
const cors = require("cors"); // CORSミドルウェア

const app = express();
const PORT = process.env.PORT || 3000;

// 許可するドメインのリスト
const allowedOrigins = [
  /^https:\/\/.*\.kits-tools\.net$/,
  /^https:\/\/.*\.kokecoco\.me$/,
  /^http:\/\/localhost:4000$/,
];

// CORS設定をカスタム
app.use(
  cors({
    origin: (origin, callback) => {
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

// 作成日や日本語の日付表現を処理する関数
const extractDateFromText = (text) => {
  const currentYear = moment().year();

  // 拡張された日付パターン
  const datePatterns = [
    /作成日[:：]?\s*(\d{4}[年\/.-]\d{1,2}[月\/.-]\d{1,2}日?)/, // "作成日 2024年10月14日" の形式
    /(\d{4}[年\/.-]\d{1,2}[月\/.-]\d{1,2}日?)/, // "2024年10月14日" の形式
    /(\d{1,2}[月\/.-]\d{1,2}日)/, // "10月14日" の形式 (西暦なし)
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let dateString = match[1];

      // 西暦がない場合は今年の西暦を追加
      if (dateString.match(/^\d{1,2}[月\/.-]\d{1,2}日/)) {
        dateString = `${currentYear}年${dateString}`; // 今年の年を追加
      }

      // "YYYY年MM月DD日" -> "YYYY-MM-DD" の変換
      dateString = dateString.replace(/[年月]/g, "-").replace(/日/, "");
      return formatDate(dateString);
    }
  }
  return null;
};

app.get("/api/get-info", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    });
    const $ = cheerio.load(response.data);

    // ページのタイトルを取得
    let title = $("title").first().text();

    // 日付が含まれる可能性のあるタグをリストアップ
    let creationDate =
      $('meta[name="date"]').attr("content") ||
      $('meta[property="article:published_time"]').attr("content") ||
      $('meta[name="publish_date"]').attr("content") ||
      $('meta[itemprop="datePublished"]').attr("content") ||
      $("time").attr("datetime") ||
      $(".entry-date.date.published").text() ||
      $(".post-date .entry-date").text() ||
      $("p:contains('作成日')").text() || // <p>タグ内に作成日が含まれている場合
      $("span:contains('作成日')").text() || // <span>タグ内に作成日が含まれている場合
      ""; // 存在しない場合はnull

    // テキストから作成日を抽出（日本語対応）
    if (!creationDate) {
      creationDate = extractDateFromText($.text());
    }

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
      /(?:\s*[\|\｜\-–—－—　\/]+\s*)/g,
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
      title: subtitle || null,
      subtitle: title || null,
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
