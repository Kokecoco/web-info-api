const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();
const PORT = process.env.PORT || 3000;

// 日付の取得関数
const extractDate = ($) => {
  // Schema.org の日付
  const schemaDate =
    $('meta[itemprop="datePublished"]').attr("content") ||
    $('meta[property="article:published_time"]').attr("content");

  if (schemaDate) return schemaDate;

  // 最終更新日や他のメタ情報からの取得
  const metaDate =
    $('meta[property="og:updated_time"]').attr("content") ||
    $('meta[name="last-modified"]').attr("content");

  return metaDate || null;
};

// タイトルとサブタイトルの取得関数
const extractTitleAndSubtitle = ($) => {
  let title = $("title").text();
  let subtitle = "";

  // パイプやハイフンで区切られているかチェック
  if (title.includes("|")) {
    [title, subtitle] = title.split("|").map((str) => str.trim());
  } else if (title.includes("-")) {
    [title, subtitle] = title.split("-").map((str) => str.trim());
  }

  return { title, subtitle };
};

// 作者の取得関数
const extractAuthor = ($) => {
  const metaAuthor =
    $('meta[name="author"]').attr("content") ||
    $('meta[property="og:author"]').attr("content");

  return metaAuthor || "手動入力が必要";
};

app.get("/api/web-info", async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: "URLが必要です" });
  }

  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    const date = extractDate($);
    const { title, subtitle } = extractTitleAndSubtitle($);
    const author = extractAuthor($);

    res.json({
      date: date || "日付が見つかりません",
      author: author,
      title: title || "タイトルが見つかりません",
      subtitle: subtitle || "サブタイトルが見つかりません",
    });
  } catch (error) {
    res.status(500).json({ error: "ページの解析に失敗しました" });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
