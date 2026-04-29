// pages/home/index.js
const app = getApp();

Page({
  data: {
    wordSets: [],
    fromQuiz: false,
  },

  onLoad(options) {
    const fromQuiz = options.from === 'quiz';
    const wordSets = app.globalData.wordSets || [];
    const currentSetId = wx.getStorageSync('currentWordSetId') || '';
    this.setData({
      wordSets: this._attachProgress(wordSets),
      fromQuiz,
      currentSetId,
    });
  },

  onShow() {
    const wordSets = app.globalData.wordSets || [];
    const currentSetId = wx.getStorageSync('currentWordSetId') || '';
    this.setData({
      wordSets: this._attachProgress(wordSets),
      currentSetId,
    });
  },

  _attachProgress(wordSets) {
    return wordSets.map(ws => {
      const progressIndex = wx.getStorageSync(`progress_${ws.setId}`);
      const hasStarted = progressIndex !== '' && progressIndex !== undefined && progressIndex !== null;
      const learned = hasStarted ? progressIndex + 1 : 0;
      const percent = Math.round(learned / ws.totalWords * 100);
      const completed = percent >= 100;
      return {
        ...ws,
        learned,
        percent,
        completed,
      };
    });
  },

  onSelectWordSet(e) {
    const { setid } = e.currentTarget.dataset;
    wx.setStorageSync('currentWordSetId', setid);

    // 跳转到背诵页，使用 reLaunch 清除页面栈
    wx.reLaunch({
      url: '/pages/quiz/index',
    });
  },
});
