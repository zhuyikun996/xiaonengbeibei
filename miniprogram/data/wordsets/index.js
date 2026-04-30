// 词表注册中心
// 新增词表时：1) 新建文件  2) 在下方 _modules 数组中加一行即可

const cambridgeA2Day1 = require('./cambridge-a2-day1');
const cambridgeA2Day2 = require('./cambridge-a2-day2');
const cambridgeA2Day3 = require('./cambridge-a2-day3');
const cambridgeA2Day4 = require('./cambridge-a2-day4');
const cambridgeA2Day5 = require('./cambridge-a2-day5');
const cambridgeA2Day6 = require('./cambridge-a2-day6');
const cambridgeA2Day7 = require('./cambridge-a2-day7');
const cambridgeA2Day8 = require('./cambridge-a2-day8');
const cambridgeA2Day9 = require('./cambridge-a2-day9');
const cambridgeA2Day10 = require('./cambridge-a2-day10');

// 所有词表模块，新增词表在此追加一行
const _modules = [
  cambridgeA2Day1,
  cambridgeA2Day2,
  cambridgeA2Day3,
  cambridgeA2Day4,
  cambridgeA2Day5,
  cambridgeA2Day6,
  cambridgeA2Day7,
  cambridgeA2Day8,
  cambridgeA2Day9,
  cambridgeA2Day10,
];

// 构建 map 和 list
const map = {};
const list = [];
_modules.forEach(function (ws) {
  map[ws.setId] = ws;
  list.push({
    setId: ws.setId,
    title: ws.title,
    subtitle: ws.subtitle,
    totalWords: ws.words.length,
  });
});

// 根据 setId 获取完整词表数据（含 words 数组）
function getWordSetById(setId) {
  return map[setId] || null;
}

module.exports = {
  list: list,
  map: map,
  getWordSetById: getWordSetById,
};
