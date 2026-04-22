// pages/home/index.js
const app = getApp();

Page({
  data: {
    wordSets: [],
    fromQuiz: false,
  },

  onLoad(options) {
    const fromQuiz = options.from === 'quiz';
    this.setData({
      wordSets: app.globalData.wordSets || [],
      fromQuiz,
    });
  },

  onShow() {
    // 如果是从 quiz 页切过来的，返回时需要刷新词表列表
    if (this.data.fromQuiz) {
      this.setData({
        wordSets: app.globalData.wordSets || [],
      });
    }
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
