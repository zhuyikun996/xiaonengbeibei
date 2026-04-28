// 批量查询单词英式音标脚本 v3
// 使用有道词典 API + Free Dictionary API 双源补充
// 用法: node scripts/fetch_phonetics.js

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// 加载所有词表
const allWords = new Set();
for (let i = 1; i <= 10; i++) {
  const dayFile = path.join(__dirname, '..', 'miniprogram', 'data', 'wordsets', `cambridge-a2-day${i}.js`);
  if (fs.existsSync(dayFile)) {
    const content = fs.readFileSync(dayFile, 'utf8');
    const match = content.match(/module\.exports\s*=\s*(\{[\s\S]*\})/);
    if (match) {
      const data = eval('(' + match[1] + ')');
      if (data.words) {
        data.words.forEach(w => {
          if (w.word) allWords.add(w.word);
        });
      }
    }
  }
}

const wordList = Array.from(allWords).sort();
console.log(`共 ${wordList.length} 个唯一单词需要查询`);

function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

// Source 1: Free Dictionary API
async function fetchFromDictAPI(word) {
  try {
    const data = await httpsGet(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
    const json = JSON.parse(data);
    if (!Array.isArray(json) || json.length === 0) return '';

    const entry = json[0];
    if (entry.phonetics && entry.phonetics.length > 0) {
      // 优先 UK
      const uk = entry.phonetics.find(p => p.audio && p.audio.includes('-uk.mp3') && p.text);
      if (uk) return uk.text;
      const withText = entry.phonetics.filter(p => p.text);
      if (withText.length > 0) return withText[0].text;
    }
    return entry.phonetic || '';
  } catch (e) {
    return '';
  }
}

// Source 2: 有道词典 (爬取页面中的音标)
async function fetchFromYoudao(word) {
  try {
    const data = await httpsGet(`https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`);
    const json = JSON.parse(data);

    // 尝试从基本释义中获取英式音标
    if (json.ec && json.ec.word) {
      const wordData = json.ec.word;
      if (Array.isArray(wordData)) {
        for (const w of wordData) {
          if (w.ukphone) return `/${w.ukphone}/`;
          if (w.phone) return `/${w.phone}/`;
        }
      } else if (wordData.ukphone) {
        return `/${wordData.ukphone}/`;
      } else if (wordData.phone) {
        return `/${wordData.phone}/`;
      }
    }

    // 尝试从其他字段获取
    if (json.simple && json.simple.word) {
      const w = json.simple.word;
      if (Array.isArray(w)) {
        for (const item of w) {
          if (item.ukphone) return `/${item.ukphone}/`;
          if (item.phone) return `/${item.phone}/`;
        }
      }
    }

    return '';
  } catch (e) {
    return '';
  }
}

async function fetchPhonetic(word) {
  // Source 1: Free Dictionary
  let phonetic = await fetchFromDictAPI(word);
  if (phonetic) return { word, phonetic };

  // Source 2: 有道
  phonetic = await fetchFromYoudao(word);
  return { word, phonetic };
}

async function main() {
  const results = {};
  const total = wordList.length;
  let fetched = 0;
  let success = 0;

  const concurrency = 3;
  for (let i = 0; i < total; i += concurrency) {
    const batch = wordList.slice(i, i + concurrency);
    const responses = await Promise.all(batch.map(w => fetchPhonetic(w)));
    responses.forEach(r => {
      fetched++;
      if (r.phonetic) {
        results[r.word] = r.phonetic;
        success++;
      }
    });
    process.stdout.write(`\r进度: ${fetched}/${total} (成功: ${success})`);
    await new Promise(r => setTimeout(r, 300));
  }

  console.log(`\n查询完成: ${success}/${total}`);

  // 写入文件
  const outputPath = path.join(__dirname, '..', 'miniprogram', 'data', 'phonetics.js');
  const lines = Object.keys(results).sort().map(k => `  "${k}": "${results[k]}"`);
  const content = `// 自动生成的音标映射 (英式音标)\n// 生成时间: ${new Date().toISOString().split('T')[0]}\n// 共 ${Object.keys(results).length} 个单词\n\nmodule.exports = {\n${lines.join(',\n')}\n};\n`;

  fs.writeFileSync(outputPath, content, 'utf8');
  console.log(`已保存到: ${outputPath}`);

  const missing = wordList.filter(w => !results[w]);
  if (missing.length > 0) {
    console.log(`\n未获取到音标的单词 (${missing.length} 个):`);
    console.log(JSON.stringify(missing));
  }
}

main();
