const axios = require("axios");
const cheerio = require("cheerio");

const URL = "https://example.com"; // 対象のURLを指定

// タイトルとサブタイトルを抽出する関数
async function getTitleAndSubtitle(url) {
  try {
    const response = await axios.get(url);
    const $ = cheerio.load(response.data);

    // ページのタイトルを取得
    let title = $("title").text();
    // メタタグのauthorを取得
    let author = $('meta[name="author"]').attr("content") || "手動";
    // ここでタイトルの分割処理を行う

    // 区切り文字のリスト
    const delimiters = [
      /(?:\s*[\|\-\–\—\－\—\s]+)\s*/g, // パイプ、ハイフン、ダッシュ、全角ハイフン、全角スペース
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
    return {
      title: title || "タイトルなし",
      subtitle: subtitle || "サブタイトルなし",
      author: author,
      creationDate: new Date().toISOString().split("T")[0], // 現在の日付をISO形式で取得
    };
  } catch (error) {
    console.error("Error fetching the URL:", error);
    return {
      title: "タイトルなし",
      subtitle: "サブタイトルなし",
      author: "手動",
      creationDate: new Date().toISOString().split("T")[0],
    };
  }
}

// 関数を実行し、結果をコンソールに出力
getTitleAndSubtitle(URL).then((result) => {
  console.log("Title:", result.title);
  console.log("Subtitle:", result.subtitle);
  console.log("Author:", result.author);
  console.log("Creation Date:", result.creationDate);
});
