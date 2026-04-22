// pages/stats/index.js
const cambridgeA2Day1 = require('../../data/wordsets/cambridge-a2-day1');

const WORD_SETS = {
  'cambridge-a2-day1': cambridgeA2Day1,
};

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
  },

  onShow() {
    this._loadStats();
  },

  _loadStats() {
    const logs = wx.getStorageSync('study_log') || {};
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

    // firstDay: 0=周日，转为周一起始
    const offset = (firstDay + 6) % 7;
    const calendarDays = [];
    // 填充前面的空白
    for (let i = 0; i < offset; i++) {
      calendarDays.push({ day: '', studied: false, isToday: false });
    }
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const studied = logs[dateStr] && logs[dateStr].wordIndices && logs[dateStr].wordIndices.length > 0;
      const isToday = dateStr === today;
      calendarDays.push({ day: i, studied, isToday });
    }

    // 词表进度
    const setId = wx.getStorageSync('currentWordSetId');
    const wordSetProgress = [];
    if (setId && WORD_SETS[setId]) {
      const ws = WORD_SETS[setId];
      const progressIndex = wx.getStorageSync(`progress_${setId}`) || 0;
      const learnedCount = progressIndex + 1;
      wordSetProgress.push({
        title: ws.title,
        learned: learnedCount,
        total: ws.words.length,
        percent: Math.round(learnedCount / ws.words.length * 100),
      });
    }

    this.setData({
      streakDays: streak,
      totalStudyDays: totalDays,
      todayCount,
      todayDuration,
      calendarDays,
      currentMonth: `${year}年${monthNames[month]}`,
      wordSetProgress,
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
