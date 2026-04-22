// app.js
const wordSets = require('./data/wordsets/index');

App({
  onLaunch() {
    this.globalData = {
      wordSets: wordSets.list,
    };
  },
});
