// utils/mastery.js — 词级别掌握度数据管理

/**
 * 存储结构说明：
 *
 * word_mastery: { [`${setId}_${wordId}`]: {
 *   setId, wordId, word,
 *   seenCount, correctCount, wrongCount,
 *   lastStudiedAt, mastered
 * }}
 *
 * daily_log: { "2026-04-30": {
 *   setId, wordIndices: [],
 *   answerCount: 0, answerCorrect: 0, answerWrong: 0,
 *   duration: 0
 * }}
 *
 * mastered 判定规则（简单、可解释）：
 *   至少答对 2 次，正确率不低于 80%，且最近一次答对
 */

function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function _masteryKey(setId, wordId) {
  return `${setId}_${wordId}`;
}

// ---------- word_mastery ----------

function getMasteryMap() {
  return wx.getStorageSync('word_mastery') || {};
}

function _saveMasteryMap(map) {
  wx.setStorageSync('word_mastery', map);
}

function getWordMastery(setId, wordId) {
  const map = getMasteryMap();
  return map[_masteryKey(setId, wordId)] || null;
}

function recordAnswer(setId, word, isCorrect) {
  const map = getMasteryMap();
  const key = _masteryKey(setId, word.id);
  const m = map[key] || {
    setId,
    wordId: word.id,
    word: word.word,
    seenCount: 0,
    correctCount: 0,
    wrongCount: 0,
    lastStudiedAt: '',
    lastIsCorrect: false,
    mastered: false,
  };

  m.seenCount++;
  if (isCorrect) {
    m.correctCount++;
  } else {
    m.wrongCount++;
  }
  m.lastStudiedAt = getToday();
  m.lastIsCorrect = isCorrect;

  const totalAnswers = m.correctCount + m.wrongCount;
  const accuracy = totalAnswers > 0 ? m.correctCount / totalAnswers : 0;
  m.mastered = m.correctCount >= 2 && accuracy >= 0.8 && m.lastIsCorrect;

  map[key] = m;
  _saveMasteryMap(map);
  return m;
}

// 获取某个词表的掌握度统计
function getSetMasteryStats(setId, totalWords) {
  const map = getMasteryMap();
  let masteredCount = 0;
  let seenCount = 0;

  for (const key in map) {
    const m = map[key];
    if (m.setId !== setId) continue;
    seenCount++;
    if (m.mastered) masteredCount++;
  }

  return {
    masteredCount,
    seenCount,
    totalCount: totalWords,
    reviewCount: seenCount - masteredCount,
    masteryPercent: totalWords > 0 ? Math.round(masteredCount / totalWords * 100) : 0,
  };
}

// 获取某个词表的薄弱词（wrongCount > 0 且未掌握）
function getWeakWords(setId, limit) {
  const map = getMasteryMap();
  const words = [];
  for (const key in map) {
    const m = map[key];
    if (m.setId !== setId) continue;
    if (!m.mastered && m.wrongCount > 0) {
      words.push(m);
    }
  }
  words.sort((a, b) => (b.wrongCount - b.correctCount) - (a.wrongCount - a.correctCount));
  return words.slice(0, limit || 5);
}

// ---------- daily_log ----------

function getDailyLog() {
  return wx.getStorageSync('daily_log') || {};
}

function _saveDailyLog(logs) {
  wx.setStorageSync('daily_log', logs);
}

function initTodayDailyLog(setId) {
  const today = getToday();
  const logs = getDailyLog();
  if (!logs[today]) {
    logs[today] = {
      setId,
      wordIndices: [],
      answerCount: 0,
      answerCorrect: 0,
      answerWrong: 0,
      duration: 0,
    };
    _saveDailyLog(logs);
  }
}

function recordDailyAnswer(isCorrect) {
  const today = getToday();
  const logs = getDailyLog();
  const log = logs[today];
  if (!log) return;

  log.answerCount = (log.answerCount || 0) + 1;
  if (isCorrect) {
    log.answerCorrect = (log.answerCorrect || 0) + 1;
  } else {
    log.answerWrong = (log.answerWrong || 0) + 1;
  }
  _saveDailyLog(logs);
}

function addDailyWordIndex(wordIndex) {
  const today = getToday();
  const logs = getDailyLog();
  const log = logs[today];
  if (!log) return;

  if (!log.wordIndices.includes(wordIndex)) {
    log.wordIndices.push(wordIndex);
  }
  _saveDailyLog(logs);
}

function addDailyDuration(seconds) {
  const today = getToday();
  const logs = getDailyLog();
  const log = logs[today];
  if (!log) return;

  log.duration = (log.duration || 0) + seconds;
  _saveDailyLog(logs);
}

// 获取今日统计
function getTodayStats() {
  const today = getToday();
  const logs = getDailyLog();
  const log = logs[today] || {};
  return {
    wordCount: (log.wordIndices || []).length,
    duration: log.duration || 0,
    answerCount: log.answerCount || 0,
    answerCorrect: log.answerCorrect || 0,
    answerWrong: log.answerWrong || 0,
    accuracy: (log.answerCount || 0) > 0
      ? Math.round((log.answerCorrect || 0) / log.answerCount * 100)
      : 0,
  };
}

// 兼容旧 study_log 的打卡天数计算
function getTotalStudyDays() {
  const dailyLogs = getDailyLog();
  const studyLogs = wx.getStorageSync('study_log') || {};
  const dates = new Set(Object.keys(dailyLogs).concat(Object.keys(studyLogs)));

  return Array.from(dates).filter(k => {
    const dailyLog = dailyLogs[k];
    const studyLog = studyLogs[k];
    const dailyWords = dailyLog && dailyLog.wordIndices ? dailyLog.wordIndices.length : 0;
    const studyWords = studyLog && studyLog.wordIndices ? studyLog.wordIndices.length : 0;
    return dailyWords > 0 || studyWords > 0;
  }).length;
}

module.exports = {
  getToday,
  getWordMastery,
  recordAnswer,
  getSetMasteryStats,
  getWeakWords,
  initTodayDailyLog,
  recordDailyAnswer,
  addDailyWordIndex,
  addDailyDuration,
  getTodayStats,
  getTotalStudyDays,
  getDailyLog,
};
