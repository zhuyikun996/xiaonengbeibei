// pages/quiz/index.js
const cambridgeA2Day1 = require('../../data/wordsets/cambridge-a2-day1');

const WORD_SETS = {
  'cambridge-a2-day1': cambridgeA2Day1,
};

Page({
  data: {
    wordSetTitle: '',
    currentIndex: 0,
    totalWords: 0,
    currentWord: null,
    showExamples: true,
    showExercise: false,
    selectedAnswer: '',
    exerciseRevealed: false,
    progressPercent: 0,
  },

  onLoad() {
    const setId = wx.getStorageSync('currentWordSetId');
    if (!setId) {
      wx.reLaunch({ url: '/pages/home/index' });
      return;
    }
    this.loadWordSet(setId);
    this._initTodayLog(setId);
  },

  onShow() {
    this._wordTimerStart = Date.now();
  },

  onHide() {
    this._pauseTimer();
  },

  _getToday() {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },

  _initTodayLog(setId) {
    const today = this._getToday();
    const logs = wx.getStorageSync('study_log') || {};
    if (!logs[today] || !logs[today].wordIndices) {
      logs[today] = { setId, wordIndices: [], duration: 0 };
      wx.setStorageSync('study_log', logs);
    }
  },

  _pauseTimer() {
    if (!this._wordTimerStart) return;
    const elapsed = Math.round((Date.now() - this._wordTimerStart) / 1000);
    if (elapsed <= 0) return;

    const today = this._getToday();
    const logs = wx.getStorageSync('study_log') || {};
    if (logs[today]) {
      logs[today].duration = (logs[today].duration || 0) + elapsed;
      wx.setStorageSync('study_log', logs);
    }
    this._wordTimerStart = null;
  },

  _addWordToLog(wordIndex) {
    const today = this._getToday();
    const logs = wx.getStorageSync('study_log') || {};
    const todayLog = logs[today];
    if (!todayLog) return;

    if (!todayLog.wordIndices.includes(wordIndex)) {
      todayLog.wordIndices.push(wordIndex);
    }
    wx.setStorageSync('study_log', logs);
  },

  loadWordSet(setId) {
    const wordSet = WORD_SETS[setId];
    if (!wordSet) {
      wx.reLaunch({ url: '/pages/home/index' });
      return;
    }

    const totalWords = wordSet.words.length;
    const progressKey = `progress_${setId}`;
    const savedIndex = wx.getStorageSync(progressKey) || 0;
    const currentIndex = Math.min(savedIndex, totalWords - 1);
    const currentWord = wordSet.words[currentIndex];

    this.setData({
      wordSetTitle: wordSet.title,
      totalWords,
      currentIndex,
      currentWord,
      showExamples: true,
      showExercise: currentWord.exercises && currentWord.exercises.length > 0,
      selectedAnswer: '',
      exerciseRevealed: false,
      progressPercent: ((currentIndex + 1) / totalWords * 100).toFixed(0),
    });
  },

  prevWord() {
    const { currentIndex, totalWords } = this.data;
    if (currentIndex <= 0) return;

    // 暂停计时 → 累加 → 重新开始
    this._pauseTimer();
    this._wordTimerStart = Date.now();

    const newIndex = currentIndex - 1;
    const setId = wx.getStorageSync('currentWordSetId');
    const currentWord = WORD_SETS[setId].words[newIndex];
    this.setData({
      currentIndex: newIndex,
      currentWord,
      showExamples: true,
      showExercise: currentWord.exercises && currentWord.exercises.length > 0,
      selectedAnswer: '',
      exerciseRevealed: false,
      progressPercent: ((newIndex + 1) / totalWords * 100).toFixed(0),
    });
    wx.setStorageSync(`progress_${setId}`, newIndex);
  },

  nextWord() {
    const { currentIndex, totalWords, exerciseRevealed, showExercise } = this.data;
    if (showExercise && !exerciseRevealed) {
      this.setData({ exerciseRevealed: true });
      return;
    }

    if (currentIndex >= totalWords - 1) return;

    // 暂停计时 → 累加 → 重新开始
    this._pauseTimer();
    this._wordTimerStart = Date.now();

    const newIndex = currentIndex + 1;
    const setId = wx.getStorageSync('currentWordSetId');
    const currentWord = WORD_SETS[setId].words[newIndex];

    // 记录已学单词
    this._addWordToLog(newIndex);

    this.setData({
      currentIndex: newIndex,
      currentWord,
      showExamples: true,
      showExercise: currentWord.exercises && currentWord.exercises.length > 0,
      selectedAnswer: '',
      exerciseRevealed: false,
      progressPercent: ((newIndex + 1) / totalWords * 100).toFixed(0),
    });
    wx.setStorageSync(`progress_${setId}`, newIndex);
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  toggleExamples() {
    this.setData({ showExamples: !this.data.showExamples });
  },

  toggleExercise() {
    this.setData({ showExercise: !this.data.showExercise });
  },

  selectAnswer(e) {
    const { answer } = e.currentTarget.dataset;
    this.setData({ selectedAnswer: answer, exerciseRevealed: true });
  },

  goHome() {
    this._pauseTimer();
    wx.reLaunch({ url: '/pages/home/index' });
  },

  switchRange() {
    wx.navigateTo({ url: '/pages/home/index?from=quiz' });
  },

  goStats() {
    wx.navigateTo({ url: '/pages/stats/index' });
  },
});
