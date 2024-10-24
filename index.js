const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const moment = require("moment"); // 日付のフォーマットに便利なライブラリ
require("moment/locale/ja"); // 日本語のロケールをロード
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

// 日本語の日付形式にも対応する正規表現
const parseJapaneseDate = (text) => {
  const dateMatch = text.match(/(\d{1,2})年(\d{1,2})月(\d{1,2})日/);
  if (dateMatch) {
    const year = dateMatch[1].length === 2 ? `20${dateMatch[1]}` : dateMatch[1]; // 西暦が2桁なら補完
    const month = dateMatch[2].padStart(2, "0");
    const day = dateMatch[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  
  const monthDayMatch = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (monthDayMatch) {
    const currentYear = moment().year(); // 今年の年を補完
    const month = monthDayMatch[1].padStart(2, "0");
    const day = monthDayMatch[2].padStart(2, "0");
    return `${currentYear}-${month}-${day}`;
  }
  
  return null;
};

app.get("/api/get-info", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // User-Agent ヘッダーを追加
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    });
    const $ = cheerio.load(response.data);

    // ページのタイトルを取得
    let title = $("title").first().text();

    // scriptタグやstyleタグの中身を除外
    $("script, style").remove();

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

    // 日本語の日付形式に対応する
    if (!creationDate) {
      creationDate = parseJapaneseDate($.text());
    }

    // 日付をフォーマットして統一
    creationDate = formatDate(creationDate);

    // メタタグやHTML内の情報から著者を取得する
    let author =
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      $('meta[itemprop="author"]').attr("content") ||
      $('meta[name="byl"]').attr("content") ||
      $('meta[name="creator"]').attr("content") ||
      $(".author").text() ||
      $(".post-author").text() ||
      $(".byline").text() ||
      $('span[itemprop="author"]').text() ||
      $('span[itemprop="name"]').text() ||
      $('a[rel="author"]').text() ||
      ""; // 存在しない場合は空文字列

    // ページ内のテキストから著者名を抽出する
    if (!author) {
      const text = $("body").text();  // scriptやstyleタグのテキストを除外した後の本文を取得
      // 「著者」や「作者」、他にも「By」や「Written by」なども含めた正規表現
      const authorMatch = text.match(/(?:by|written by|作者[:：]\s*|著者[:：]\s*)([a-zA-Z\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\s]+)/i);
      if (authorMatch) {
        author = authorMatch[1].trim();
      }
    }

    // 不要な文字列を除去
    author = author.replace(/^(by|written by|作者|著者)\s+/i, '').trim();

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
