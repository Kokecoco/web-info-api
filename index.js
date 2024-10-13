app.get("/api/get-info", async (req, res) => {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL is required" });
  }

  try {
    // User-Agent、Referer、Accept-Language ヘッダーを追加
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
        'Referer': 'https://www.google.com', // 一般的な参照元としてGoogleを指定
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8', // 日本語を優先した言語設定
      }
    });
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
