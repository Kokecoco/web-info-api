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
  
  const monthDayMatch = text.match(/(\d
