// pages/quiz/index.js
const cambridgeA2Day1 = require('../../data/wordsets/cambridge-a2-day1');
const cambridgeA2Day2 = require('../../data/wordsets/cambridge-a2-day2');
const cambridgeA2Day3 = require('../../data/wordsets/cambridge-a2-day3');
const cambridgeA2Day4 = require('../../data/wordsets/cambridge-a2-day4');
const cambridgeA2Day5 = require('../../data/wordsets/cambridge-a2-day5');
const cambridgeA2Day6 = require('../../data/wordsets/cambridge-a2-day6');
const cambridgeA2Day7 = require('../../data/wordsets/cambridge-a2-day7');
const cambridgeA2Day8 = require('../../data/wordsets/cambridge-a2-day8');
const cambridgeA2Day9 = require('../../data/wordsets/cambridge-a2-day9');
const cambridgeA2Day10 = require('../../data/wordsets/cambridge-a2-day10');

const WORD_SETS = {
  'cambridge-a2-day1': cambridgeA2Day1,
  'cambridge-a2-day2': cambridgeA2Day2,
  'cambridge-a2-day3': cambridgeA2Day3,
  'cambridge-a2-day4': cambridgeA2Day4,
  'cambridge-a2-day5': cambridgeA2Day5,
  'cambridge-a2-day6': cambridgeA2Day6,
  'cambridge-a2-day7': cambridgeA2Day7,
  'cambridge-a2-day8': cambridgeA2Day8,
  'cambridge-a2-day9': cambridgeA2Day9,
  'cambridge-a2-day10': cambridgeA2Day10,
};

function parseChoiceQuestion(rawQuestion = '') {
  const lines = rawQuestion
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
  const optionPattern = /^([A-Z])\.\s*(.+)$/;
  const firstOptionIndex = lines.findIndex(line => optionPattern.test(line));
  const promptLines = firstOptionIndex === -1 ? lines : lines.slice(0, firstOptionIndex);
  const optionLines = firstOptionIndex === -1 ? [] : lines.slice(firstOptionIndex);
  const options = optionLines
    .map((line) => {
      const match = line.match(optionPattern);
      if (!match) return null;
      return {
        key: match[1],
        text: match[2],
      };
    })
    .filter(Boolean);

  return {
    prompt: promptLines.join('\n'),
    options,
  };
}

Page({
  data: {
    wordSetTitle: '',
    currentIndex: 0,
    totalWords: 0,
    currentWord: null,
    mode: 'study',
    showExamples: true,
    showExercise: false,
    selectedAnswer: '',
    exerciseRevealed: false,
    progressPercent: 0,
    currentExercise: null,
    choiceOptions: [],
    answered: false,
    isCorrect: false,
    feedbackText: '',
    nextButtonText: '下一个',
    currentExerciseAnswerDisplay: '',
    correctCount: 0,
    wrongCount: 0,
    streakCount: 0,
    fillInput: '',
    showPoster: false,
    streakDaysForPoster: 0,
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
    this._setCurrentWordState({
      wordSetTitle: wordSet.title,
      currentIndex,
      totalWords,
      currentWord,
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
    this._setCurrentWordState({
      currentIndex: newIndex,
      totalWords,
      currentWord,
    });
    wx.setStorageSync(`progress_${setId}`, newIndex);
  },

  nextWord() {
    const {
      answered,
      currentExercise,
      currentIndex,
      totalWords,
      exerciseRevealed,
      mode,
      showExercise,
    } = this.data;

    if (mode === 'test' && currentExercise && currentExercise.type === 'choice' && !answered) {
      wx.showToast({ title: '先完成作答', icon: 'none' });
      return;
    }

    if (mode === 'study' && showExercise && !exerciseRevealed) {
      this.setData({
        exerciseRevealed: true,
        nextButtonText: '下一个',
      });
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

    this._setCurrentWordState({
      currentIndex: newIndex,
      totalWords,
      currentWord,
    });
    wx.setStorageSync(`progress_${setId}`, newIndex);
    wx.pageScrollTo({ scrollTop: 0, duration: 0 });
  },

  switchMode(e) {
    const { mode } = e.currentTarget.dataset;
    if (!mode || mode === this.data.mode) return;

    this.setData({ mode }, () => {
      const { currentWord, currentIndex, totalWords } = this.data;
      this._setCurrentWordState({
        currentIndex,
        totalWords,
        currentWord,
      });
    });
  },

  toggleExamples() {
    if (this.data.mode === 'test' && !this.data.answered) return;
    this.setData({ showExamples: !this.data.showExamples });
  },

  toggleExercise() {
    if (this.data.mode === 'test' && this.data.currentExercise && !this.data.answered) return;
    this.setData({ showExercise: !this.data.showExercise });
  },

  selectAnswer(e) {
    const { answer } = e.currentTarget.dataset;
    this.setData({ selectedAnswer: answer, exerciseRevealed: true });
  },

  onSelectChoice(e) {
    const { key } = e.currentTarget.dataset;
    const { answered, currentExercise } = this.data;
    if (answered || !currentExercise) return;

    const isCorrect = this._isChoiceCorrect(key, currentExercise.answer);
    this._recordAnswerResult({
      answered: true,
      feedbackText: isCorrect ? '回答正确，继续保持。' : '这题答错了，看看正确答案。',
      isCorrect,
      selectedAnswer: key,
      showExamples: true,
      showExercise: true,
      exerciseRevealed: true,
    });
  },

  _isChoiceCorrect(selectedKey, answer) {
    if (!answer) return false;
    if (selectedKey === answer) return true;

    const selectedOption = this.data.choiceOptions.find(item => item.key === selectedKey);
    return !!selectedOption && selectedOption.text === answer;
  },

  onFillInput(e) {
    this.setData({ fillInput: e.detail.value });
  },

  onSubmitFill() {
    const { fillInput, answered, currentExercise, currentWord } = this.data;
    if (answered || !currentExercise) return;

    const input = (fillInput || '').trim();
    if (!input) {
      wx.showToast({ title: '请输入答案', icon: 'none' });
      return;
    }

    const isCorrect = this._isFillCorrect(input, currentExercise.answer, currentWord);
    this._recordAnswerResult({
      answered: true,
      feedbackText: isCorrect ? '回答正确，继续保持。' : '这题答错了，看看正确答案。',
      isCorrect,
      showExamples: true,
      showExercise: true,
      exerciseRevealed: true,
    });
  },

  _isFillCorrect(userInput, answer, word) {
    const input = userInput.toLowerCase();

    const acceptedList = (answer || '').split(' / ').map(a => {
      return a.replace(/[（(].+?[）)]/g, '').trim().toLowerCase();
    }).filter(Boolean);

    if (acceptedList.includes(input)) return true;

    // 检查 alternatives
    if (word && word.alternatives && word.alternatives.length > 0) {
      if (word.alternatives.some(alt => alt.trim().toLowerCase() === input)) return true;
    }

    return false;
  },

  _recordAnswerResult(extraState) {
    const isCorrect = !!extraState.isCorrect;
    const nextCorrectCount = this.data.correctCount + (isCorrect ? 1 : 0);
    const nextWrongCount = this.data.wrongCount + (isCorrect ? 0 : 1);
    const nextStreakCount = isCorrect ? this.data.streakCount + 1 : 0;

    this.setData({
      ...extraState,
      nextButtonText: '下一个',
      correctCount: nextCorrectCount,
      wrongCount: nextWrongCount,
      streakCount: nextStreakCount,
    });
  },

  _buildExerciseState(word) {
    if (!word || !word.exercises || word.exercises.length === 0) {
      return {
        currentExercise: null,
        currentExerciseAnswerDisplay: '',
        choiceOptions: [],
      };
    }

    // 自测模式优先选 choice 题，学习模式取第一题
    let exercise;
    if (this.data.mode === 'test') {
      exercise = word.exercises.find(e => e.type === 'choice') || word.exercises[0];
    } else {
      exercise = word.exercises[0];
    }
    if (!exercise) {
      return {
        currentExercise: null,
        currentExerciseAnswerDisplay: '',
        choiceOptions: [],
      };
    }

    if (exercise.type === 'choice') {
      const parsed = parseChoiceQuestion(exercise.question);
      const matchedOption = parsed.options.find(item => item.key === exercise.answer || item.text === exercise.answer);
      return {
        currentExercise: {
          ...exercise,
          prompt: parsed.prompt || exercise.question,
        },
        currentExerciseAnswerDisplay: matchedOption ? `${matchedOption.key}. ${matchedOption.text}` : exercise.answer,
        choiceOptions: parsed.options,
      };
    }

    return {
      currentExercise: {
        ...exercise,
        prompt: exercise.question,
      },
      currentExerciseAnswerDisplay: exercise.answer || '',
      choiceOptions: [],
    };
  },

  _setCurrentWordState({
    wordSetTitle,
    currentIndex,
    totalWords,
    currentWord,
  }) {
    const exerciseState = this._buildExerciseState(currentWord);
    const hasExercise = currentWord && currentWord.exercises && currentWord.exercises.length > 0;
    const isTestMode = this.data.mode === 'test';

    this.setData({
      ...(wordSetTitle ? { wordSetTitle } : {}),
      currentIndex,
      totalWords,
      currentWord,
      currentExercise: exerciseState.currentExercise,
      currentExerciseAnswerDisplay: exerciseState.currentExerciseAnswerDisplay,
      choiceOptions: exerciseState.choiceOptions,
      showExamples: !isTestMode,
      showExercise: hasExercise,
      selectedAnswer: '',
      answered: false,
      isCorrect: false,
      feedbackText: '',
      exerciseRevealed: false,
      fillInput: '',
      nextButtonText: isTestMode && exerciseState.currentExercise
        ? '先答题'
        : (hasExercise ? '揭晓答案' : '下一个'),
      progressPercent: ((currentIndex + 1) / totalWords * 100).toFixed(0),
    });
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

  onSharePoster() {
    const logs = wx.getStorageSync('study_log') || {};
    const totalDays = Object.keys(logs).filter(k => logs[k] && logs[k].wordIndices && logs[k].wordIndices.length > 0).length;
    this.setData({
      streakDaysForPoster: totalDays,
      showPoster: true,
    });
  },

  onClosePoster() {
    this.setData({ showPoster: false });
  },
});
