// pages/stats/index.js
const wordsetRegistry = require('../../data/wordsets/index');
const mastery = require('../../utils/mastery');

function getToday() {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthDays(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getMergedStudyLogs() {
  const dailyLogs = mastery.getDailyLog();
  const studyLogs = wx.getStorageSync('study_log') || {};
  const dates = new Set(Object.keys(dailyLogs).concat(Object.keys(studyLogs)));
  const logs = {};

  dates.forEach(date => {
    const dailyLog = dailyLogs[date] || {};
    const studyLog = studyLogs[date] || {};
    const dailyWords = dailyLog.wordIndices || [];
    const studyWords = studyLog.wordIndices || [];
    const wordIndices = dailyWords.length > 0 ? dailyWords : studyWords;

    logs[date] = {
      setId: dailyLog.setId || studyLog.setId,
      wordIndices,
      duration: dailyLog.duration || studyLog.duration || 0,
      answerCount: dailyLog.answerCount || 0,
      answerCorrect: dailyLog.answerCorrect || 0,
      answerWrong: dailyLog.answerWrong || 0,
    };
  });

  return logs;
}

Page({
  data: {
    streakDays: 0,
    totalStudyDays: 0,
    todayCount: 0,
    todayDuration: 0,
    calendarDays: [],
    currentMonth: '',
    weekLabels: ['一', '二', '三', '四', '五', '六', '日'],
    wordSetProgress: [],
    showPoster: false,
    todayAccuracy: 0,
    todayAnswerCount: 0,
    masteredCount: 0,
    reviewCount: 0,
    weakWords: [],
  },

  onShow() {
    this._loadStats();
  },

  _loadStats() {
    const logs = getMergedStudyLogs();
    const today = getToday();

    // 计算连续打卡天数
    let streak = 0;
    const d = new Date();
    let checkDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    while (true) {
      const dateStr = formatDate(checkDate);
      if (logs[dateStr] && logs[dateStr].wordIndices && logs[dateStr].wordIndices.length > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    // 累计打卡天数
    const totalDays = Object.keys(logs).filter(k => logs[k] && logs[k].wordIndices && logs[k].wordIndices.length > 0).length;

    // 今日学习
    const todayLog = logs[today] || {};
    const todayCount = (todayLog.wordIndices || []).length;
    const todayDuration = todayLog.duration || 0;

    // 生成当月日历
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDaysInMonth = getMonthDays(year, month);
    const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

    const offset = (firstDay + 6) % 7;
    const calendarDays = [];
    for (let i = 0; i < offset; i++) {
      calendarDays.push({ day: '', studied: false, isToday: false });
    }
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const studied = logs[dateStr] && logs[dateStr].wordIndices && logs[dateStr].wordIndices.length > 0;
      const isToday = dateStr === today;
      calendarDays.push({ day: i, studied, isToday });
    }

    // 词表进度（掌握度）
    const setId = wx.getStorageSync('currentWordSetId');
    const wordSetProgress = [];
    let masteredCount = 0;
    let reviewCount = 0;
    const weakWords = [];
    if (setId) {
      const ws = wordsetRegistry.getWordSetById(setId);
      if (ws) {
        const masteryStats = mastery.getSetMasteryStats(setId, ws.words.length);
        masteredCount = masteryStats.masteredCount;
        reviewCount = masteryStats.reviewCount;
        wordSetProgress.push({
          title: ws.title,
          learned: masteryStats.seenCount,
          total: ws.words.length,
          percent: masteryStats.masteryPercent,
          masteredCount: masteryStats.masteredCount,
        });

        // 薄弱词
        const weak = mastery.getWeakWords(setId, 5);
        weak.forEach(w => {
          const wordData = ws.words.find(word => word.id === w.wordId);
          if (wordData) {
            weakWords.push({
              word: wordData.word,
              meaning: wordData.meaning,
              correctCount: w.correctCount,
              wrongCount: w.wrongCount,
            });
          }
        });
      }
    }

    // 今日答题统计
    const todayStats = mastery.getTodayStats();

    this.setData({
      streakDays: streak,
      totalStudyDays: totalDays,
      todayCount,
      todayDuration,
      calendarDays,
      currentMonth: `${year}年${monthNames[month]}`,
      wordSetProgress,
      todayAccuracy: todayStats.accuracy,
      todayAnswerCount: todayStats.answerCount,
      masteredCount,
      reviewCount,
      weakWords,
    });
  },

  formatDuration(seconds) {
    if (seconds < 60) return `${seconds}秒`;
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return sec > 0 ? `${min}分${sec}秒` : `${min}分钟`;
  },

  onSharePoster() {
    this.setData({ showPoster: true });
  },

  onClosePoster() {
    this.setData({ showPoster: false });
  },
});
